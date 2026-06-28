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
    'GridCol',
    'Card',
    'CardSection',
    'Paper',
    'Center',
    'Flex',
    'AspectRatio',
    'Affix',
    'AppShell',
    'AppShellHeader',
    'AppShellNavbar',
    'AppShellAside',
    'AppShellMain',
    'AppShellFooter',
    'AppShellSection',
    'Collapse',
    'Indicator',
    'ScrollArea',
    'Spoiler',
    'ScrollAreaAutosize',
    'TableScrollContainer',
    'VisuallyHidden',
    'Divider',
    'Space',
    'Box',
    'Title',
    'Text',
    'Badge',
    'Code',
    'Kbd',
    'Mark',
    'Pill',
    'PillGroup',
    'TypographyStylesProvider',
    'NumberFormatter',
    'Blockquote',
    'Highlight',
    'List',
    'ListItem',
    'Markdown',
    'Button',
    'ButtonGroup',
    'ButtonGroupSection',
    'ActionIcon',
    'ActionIconGroup',
    'ActionIconGroupSection',
    'UnstyledButton',
    'Burger',
    'CloseButton',
    'CopyButton',
    'Input',
    'InputBase',
    'InputWrapper',
    'InputLabel',
    'InputDescription',
    'InputPlaceholder',
    'InputClearButton',
    'InputError',
    'TextInput',
    'Autocomplete',
    'PasswordInput',
    'Textarea',
    'Select',
    'MultiSelect',
    'NativeSelect',
    'Combobox',
    'ComboboxTarget',
    'ComboboxDropdownTarget',
    'ComboboxEventsTarget',
    'ComboboxDropdown',
    'ComboboxOptions',
    'ComboboxOption',
    'ComboboxSearch',
    'ComboboxEmpty',
    'ComboboxGroup',
    'ComboboxHeader',
    'ComboboxFooter',
    'ComboboxChevron',
    'ComboboxClearButton',
    'ComboboxHiddenInput',
    'Checkbox',
    'CheckboxGroup',
    'CheckboxCard',
    'CheckboxIndicator',
    'Switch',
    'SwitchGroup',
    'RadioGroup',
    'Radio',
    'RadioCard',
    'RadioIndicator',
    'NumberInput',
    'DateInput',
    'Chip',
    'ChipGroup',
    'Slider',
    'RangeSlider',
    'SegmentedControl',
    'PinInput',
    'ColorInput',
    'ColorPicker',
    'HueSlider',
    'AlphaSlider',
    'AngleSlider',
    'ColorSwatch',
    'JsonInput',
    'TagsInput',
    'FileInput',
    'FileButton',
    'Fieldset',
    'PillsInput',
    'PillsInputField',
    'Rating',
    'DynamicForm',
    'Table',
    'TableCaption',
    'TableThead',
    'TableTbody',
    'TableTfoot',
    'TableTr',
    'TableTh',
    'TableTd',
    'DataTable',
    'Accordion',
    'AccordionItem',
    'AccordionControl',
    'AccordionPanel',
    'Timeline',
    'TimelineItem',
    'Tree',
    'MetricCard',
    'StatCard',
    'Anchor',
    'NavLink',
    'Breadcrumbs',
    'Menu',
    'MenuTarget',
    'MenuDropdown',
    'MenuItem',
    'MenuLabel',
    'MenuDivider',
    'Tabs',
    'TabsList',
    'TabsTab',
    'TabsPanel',
    'Stepper',
    'StepperStep',
    'StepperCompleted',
    'Pagination',
    'PaginationRoot',
    'PaginationControl',
    'PaginationDots',
    'PaginationFirst',
    'PaginationItems',
    'PaginationLast',
    'PaginationNext',
    'PaginationPrevious',
    'TableOfContents',
    'Modal',
    'ModalRoot',
    'ModalOverlay',
    'ModalContent',
    'ModalHeader',
    'ModalTitle',
    'ModalCloseButton',
    'ModalBody',
    'ModalStack',
    'ModalBase',
    'ModalBaseOverlay',
    'ModalBaseContent',
    'ModalBaseHeader',
    'ModalBaseTitle',
    'ModalBaseCloseButton',
    'ModalBaseBody',
    'Drawer',
    'DrawerRoot',
    'DrawerOverlay',
    'DrawerContent',
    'DrawerHeader',
    'DrawerTitle',
    'DrawerCloseButton',
    'DrawerBody',
    'DrawerStack',
    'Tooltip',
    'TooltipFloating',
    'TooltipGroup',
    'Popover',
    'PopoverTarget',
    'PopoverDropdown',
    'HoverCard',
    'HoverCardTarget',
    'HoverCardDropdown',
    'Dialog',
    'Overlay',
    'Portal',
    'OptionalPortal',
    'Transition',
    'FocusTrap',
    'FocusTrapInitialFocus',
    'FloatingArrow',
    'FloatingIndicator',
    'NativeScrollArea',
    'RemoveScroll',
    'Alert',
    'Notification',
    'NotificationBlock',
    'LoadingOverlay',
    'Loader',
    'Progress',
    'ProgressRoot',
    'ProgressSection',
    'ProgressLabel',
    'RingProgress',
    'SemiCircleProgress',
    'Skeleton',
    'Image',
    'BackgroundImage',
    'Avatar',
    'AvatarGroup',
    'ThemeIcon',
    'Icon',
    'CheckIcon',
    'CloseIcon',
    'RadioIcon',
    'AccordionChevron',
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
const Builder_GRID_CHILDREN = ['GridCol', 'Grid', 'Card', 'Paper', 'Box', 'Stack', 'Group', 'Center', 'Flex', 'ScrollArea', 'ScrollAreaAutosize', 'Spoiler', 'Collapse', 'Indicator', 'Container', 'Section', 'MetricCard', 'StatCard', 'ChartPlaceholder'] as const;
const Builder_CARD_SLOT_CHILDREN = ['Title', 'Text', 'Badge', 'Code', 'Kbd', 'Mark', 'Pill', 'Button', 'ActionIcon', 'UnstyledButton', 'CloseButton', 'Burger', 'Group', 'Stack', 'Anchor', 'Icon', 'ThemeIcon', 'Avatar'] as const;
const Builder_ACTION_SLOT_CHILDREN = ['Button', 'ActionIcon', 'UnstyledButton', 'CloseButton', 'Burger', 'CopyButton', 'FileButton', 'Anchor', 'Group'] as const;
const Builder_SECTION_SLOT_CHILDREN = ['Container', 'Stack', 'Group', 'Card', 'Paper', 'Title', 'Text', 'Badge', 'Button', 'ActionIcon', 'Anchor', 'NavLink', 'Breadcrumbs', 'Menu', 'TableOfContents'] as const;
const Builder_INPUT_SECTION_SLOT_CHILDREN = ['Icon', 'Avatar', 'Badge', 'Text', 'Code', 'Kbd'] as const;
const Builder_TEXT_INLINE_CHILDREN = ['Badge', 'Code', 'Kbd', 'Mark', 'Highlight', 'Pill', 'NumberFormatter', 'Icon', 'ThemeIcon', 'Anchor', 'VisuallyHidden'] as const;
const Builder_FORM_FIELD_TYPES = ['Fieldset', 'InputWrapper', 'Input', 'InputBase', 'InputLabel', 'InputDescription', 'InputPlaceholder', 'InputClearButton', 'InputError', 'TextInput', 'Autocomplete', 'PasswordInput', 'Textarea', 'Select', 'MultiSelect', 'NativeSelect', 'Combobox', 'ComboboxTarget', 'ComboboxDropdownTarget', 'ComboboxEventsTarget', 'ComboboxDropdown', 'ComboboxOptions', 'ComboboxOption', 'ComboboxSearch', 'ComboboxEmpty', 'ComboboxGroup', 'ComboboxHeader', 'ComboboxFooter', 'ComboboxChevron', 'ComboboxClearButton', 'ComboboxHiddenInput', 'CheckboxGroup', 'Checkbox', 'CheckboxCard', 'SwitchGroup', 'Switch', 'RadioGroup', 'Radio', 'RadioCard', 'NumberInput', 'DateInput', 'ChipGroup', 'Chip', 'Slider', 'RangeSlider', 'SegmentedControl', 'PinInput', 'ColorInput', 'ColorPicker', 'HueSlider', 'AlphaSlider', 'AngleSlider', 'ColorSwatch', 'JsonInput', 'TagsInput', 'FileInput', 'FileButton', 'PillsInput', 'PillsInputField', 'Rating', 'Button', 'ActionIcon', 'UnstyledButton', 'Burger', 'CloseButton', 'CopyButton'] as const;
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

const numberArraySchema = {
    type: 'array',
    items: numberSchema
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

const menuItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
            label: stringSchema,
            href: stringSchema,
            color: colorSchema,
            disabled: booleanSchema,
            divider: booleanSchema
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

const accordionItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'content'],
        properties: {
            label: stringSchema,
            value: stringSchema,
            content: stringSchema,
            disabled: booleanSchema
        }
    }
} as const;

const timelineItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: {
            title: stringSchema,
            description: stringSchema,
            time: stringSchema,
            color: colorSchema
        }
    }
} as const;

const stepperStepArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
            label: stringSchema,
            description: stringSchema,
            content: stringSchema,
            disabled: booleanSchema
        }
    }
} as const;

const tocItemArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'href'],
        properties: {
            label: stringSchema,
            href: stringSchema,
            active: booleanSchema
        }
    }
} as const;

const treeNodeArraySchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: true,
        required: ['label', 'value'],
        properties: {
            label: stringSchema,
            value: stringSchema,
            children: {
                type: 'array',
                items: {
                    type: 'object',
                    additionalProperties: true
                }
            }
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
        type: 'GridCol',
        displayName: 'Grid Column',
        category: 'Layout',
        description: 'Mantine grid column for controlled spans inside a Grid.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                span: integerSchema,
                offset: integerSchema,
                order: integerSchema
            }
        },
        defaultProps: {
            span: 6
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
        type: 'CardSection',
        displayName: 'Card Section',
        category: 'Layout',
        description: 'Mantine Card section for edge-to-edge media or grouped card content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                inheritPadding: booleanSchema,
                withBorder: booleanSchema,
                padding: spacingSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            inheritPadding: true,
            withBorder: false
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Paper',
        displayName: 'Paper',
        category: 'Layout',
        description: 'Mantine surface wrapper for lightweight framed content.',
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
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Center',
        displayName: 'Center',
        category: 'Layout',
        description: 'Centers children on both axes.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                inline: booleanSchema,
                padding: spacingSchema,
                width: { type: ['string', 'number'] },
                height: { type: ['string', 'number'] },
                minHeight: { type: ['string', 'number'] }
            }
        },
        defaultProps: {
            minHeight: 120
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Flex',
        displayName: 'Flex',
        category: 'Layout',
        description: 'Flexible row or column layout with Mantine spacing tokens.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                direction: { type: 'string', enum: ['row', 'column', 'row-reverse', 'column-reverse'] },
                gap: spacingSchema,
                align: { type: 'string', enum: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'] },
                justify: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
                wrap: booleanSchema
            }
        },
        defaultProps: {
            direction: 'row',
            gap: 'md',
            align: 'stretch',
            wrap: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AspectRatio',
        displayName: 'Aspect Ratio',
        category: 'Layout',
        description: 'Keeps media or embedded content at a fixed visual ratio.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                ratio: numberSchema,
                width: { type: ['string', 'number'] },
                maxWidth: { type: ['string', 'number'] }
            }
        },
        defaultProps: {
            ratio: 1.7777777777777777
        },
        allowedChildren: ['Image', 'Box', 'Card', 'Paper', 'Stack', 'Text']
    },
    {
        type: 'Affix',
        displayName: 'Affix',
        category: 'Layout',
        description: 'Fixed-position floating wrapper.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                position: objectSchema,
                zIndex: integerSchema
            }
        },
        defaultProps: {
            position: {
                bottom: 24,
                right: 24
            },
            zIndex: 200
        },
        allowedChildren: ['Button', 'ActionIcon', 'Card', 'Paper', 'Group', 'Text']
    },
    {
        type: 'AppShell',
        displayName: 'App Shell',
        category: 'Layout',
        description: 'Application frame with optional header, navbar, aside, main, and footer slots.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                padding: spacingSchema,
                headerHeight: integerSchema,
                navbarWidth: integerSchema,
                asideWidth: integerSchema,
                footerHeight: integerSchema
            }
        },
        defaultProps: {
            padding: 'md',
            headerHeight: 56,
            navbarWidth: 240
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page'),
        slots: {
            header: {
                displayName: 'Header',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            navbar: {
                displayName: 'Navbar',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            aside: {
                displayName: 'Aside',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            },
            footer: {
                displayName: 'Footer',
                allowedChildren: [...Builder_SECTION_SLOT_CHILDREN]
            }
        }
    },
    {
        type: 'AppShellHeader',
        displayName: 'App Shell Header',
        category: 'Layout',
        description: 'Header region inside a Mantine AppShell.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                height: { type: ['string', 'number'] },
                padding: spacingSchema,
                withBorder: booleanSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            height: 56,
            padding: 'md',
            withBorder: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AppShellNavbar',
        displayName: 'App Shell Navbar',
        category: 'Layout',
        description: 'Navigation sidebar region inside a Mantine AppShell.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                width: { type: ['string', 'number'] },
                padding: spacingSchema,
                withBorder: booleanSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            width: 240,
            padding: 'md',
            withBorder: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AppShellAside',
        displayName: 'App Shell Aside',
        category: 'Layout',
        description: 'Secondary aside region inside a Mantine AppShell.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                width: { type: ['string', 'number'] },
                padding: spacingSchema,
                withBorder: booleanSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            width: 240,
            padding: 'md',
            withBorder: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AppShellMain',
        displayName: 'App Shell Main',
        category: 'Layout',
        description: 'Main content region inside a Mantine AppShell.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                padding: spacingSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            padding: 'md'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AppShellFooter',
        displayName: 'App Shell Footer',
        category: 'Layout',
        description: 'Footer region inside a Mantine AppShell.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                height: { type: ['string', 'number'] },
                padding: spacingSchema,
                withBorder: booleanSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            height: 56,
            padding: 'md',
            withBorder: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'AppShellSection',
        displayName: 'App Shell Section',
        category: 'Layout',
        description: 'Flexible section inside an AppShell header, navbar, aside, or footer.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                grow: booleanSchema,
                padding: spacingSchema,
                children: stringSchema
            }
        },
        defaultProps: {
            grow: false,
            padding: 'md'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Collapse',
        displayName: 'Collapse',
        category: 'Layout',
        description: 'Collapsible content wrapper controlled by a boolean opened prop.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                transitionDuration: integerSchema
            }
        },
        defaultProps: {
            opened: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Indicator',
        displayName: 'Indicator',
        category: 'Layout',
        description: 'Badge-like indicator attached to a child element.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                color: colorSchema,
                size: integerSchema,
                position: { type: 'string', enum: ['top-start', 'top-center', 'top-end', 'middle-start', 'middle-center', 'middle-end', 'bottom-start', 'bottom-center', 'bottom-end'] },
                withBorder: booleanSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            label: '',
            color: 'red',
            position: 'top-end',
            withBorder: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'ScrollArea',
        displayName: 'Scroll Area',
        category: 'Layout',
        description: 'Scrollable content region with stable dimensions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                width: { type: ['string', 'number'] },
                height: { type: ['string', 'number'] },
                type: { type: 'string', enum: ['auto', 'always', 'scroll', 'hover', 'never'] },
                offsetScrollbars: booleanSchema
            }
        },
        defaultProps: {
            height: 240,
            type: 'hover',
            offsetScrollbars: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Spoiler',
        displayName: 'Spoiler',
        category: 'Layout',
        description: 'Collapsible content preview with show and hide labels.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                maxHeight: integerSchema,
                showLabel: stringSchema,
                hideLabel: stringSchema,
                expanded: booleanSchema
            }
        },
        defaultProps: {
            maxHeight: 120,
            showLabel: 'Show more',
            hideLabel: 'Show less'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'ScrollAreaAutosize',
        displayName: 'Auto Scroll Area',
        category: 'Layout',
        description: 'Scroll area that grows until max height or max width is reached.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                maxHeight: { type: ['string', 'number'] },
                maxWidth: { type: ['string', 'number'] },
                type: { type: 'string', enum: ['auto', 'always', 'scroll', 'hover', 'never'] },
                offsetScrollbars: booleanSchema
            }
        },
        defaultProps: {
            maxHeight: 320,
            type: 'hover',
            offsetScrollbars: true
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'TableScrollContainer',
        displayName: 'Table Scroll Container',
        category: 'Layout',
        description: 'Responsive horizontal scroll wrapper for tables.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                minWidth: { type: ['string', 'number'] },
                type: { type: 'string', enum: ['native', 'scrollarea'] }
            }
        },
        defaultProps: {
            minWidth: 640
        },
        allowedChildren: ['Table', 'DataTable', 'Box']
    },
    {
        type: 'VisuallyHidden',
        displayName: 'Visually Hidden',
        category: 'Layout',
        description: 'Accessible text or content hidden visually but available to assistive technology.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Accessible label'
        },
        allowedChildren: ['Text', 'Code', 'Kbd']
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
        allowedChildren: ['TimelineItem']
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
        type: 'Code',
        displayName: 'Code',
        category: 'Typography',
        description: 'Inline or block monospace code text.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                color: colorSchema,
                block: booleanSchema
            }
        },
        defaultProps: {
            children: 'npm run dev',
            block: false
        },
        uiSchema: {
            children: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions
            }
        },
        allowedChildren: []
    },
    {
        type: 'Kbd',
        displayName: 'Keyboard Key',
        category: 'Typography',
        description: 'Keyboard shortcut or keycap label.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            children: 'Ctrl K',
            size: 'sm'
        },
        allowedChildren: []
    },
    {
        type: 'Mark',
        displayName: 'Mark',
        category: 'Typography',
        description: 'Highlighted inline text.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            children: 'Highlighted text',
            color: 'yellow'
        },
        allowedChildren: []
    },
    {
        type: 'Pill',
        displayName: 'Pill',
        category: 'Typography',
        description: 'Compact pill-shaped label.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                size: sizeSchema,
                radius: sizeSchema,
                withRemoveButton: booleanSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Pill',
            size: 'md'
        },
        allowedChildren: []
    },
    {
        type: 'PillGroup',
        displayName: 'Pill Group',
        category: 'Typography',
        description: 'Group of Mantine Pill labels with consistent spacing.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'pill-group-item',
                type: 'Pill',
                props: {
                    children: 'Pill'
                }
            }
        ],
        allowedChildren: ['Pill']
    },
    {
        type: 'TypographyStylesProvider',
        displayName: 'Typography Styles Provider',
        category: 'Typography',
        description: 'Typography wrapper for rich text or CMS content styled with Mantine defaults.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                component: { type: 'string', enum: ['div', 'article', 'section'] }
            }
        },
        defaultProps: {
            component: 'div'
        },
        defaultChildren: [
            {
                id: 'typography-provider-text',
                type: 'Text',
                props: {
                    children: 'Rich text content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'NumberFormatter',
        displayName: 'Number Formatter',
        category: 'Typography',
        description: 'Formatted numeric text with prefix, suffix, and separators.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: { type: ['string', 'number'] },
                prefix: stringSchema,
                suffix: stringSchema,
                thousandSeparator: stringSchema,
                decimalSeparator: stringSchema,
                decimalScale: integerSchema,
                fixedDecimalScale: booleanSchema
            }
        },
        defaultProps: {
            value: 1234,
            thousandSeparator: ','
        },
        allowedChildren: []
    },
    {
        type: 'Blockquote',
        displayName: 'Blockquote',
        category: 'Typography',
        description: 'Quoted content with optional citation.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                cite: stringSchema,
                color: colorSchema,
                radius: sizeSchema,
                iconSize: numberSchema
            }
        },
        defaultProps: {
            children: 'A useful quote belongs here.',
            cite: '',
            color: 'blue',
            radius: 'sm'
        },
        uiSchema: {
            children: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions
            },
            radius: {
                'ui:widget': 'select'
            }
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'Highlight',
        displayName: 'Highlight',
        category: 'Typography',
        description: 'Text with one highlighted phrase.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                highlight: stringSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            children: 'Highlight important words in this sentence.',
            highlight: 'important',
            color: 'yellow'
        },
        uiSchema: {
            children: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions
            }
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
        allowedChildren: ['ListItem', 'Text', 'Badge', 'Anchor', 'Icon']
    },
    {
        type: 'ListItem',
        displayName: 'List Item',
        category: 'Typography',
        description: 'Item inside a Mantine List, with inline Builder children or text content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                icon: stringSchema
            }
        },
        defaultProps: {
            children: 'List item'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
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
        type: 'ButtonGroup',
        displayName: 'Button Group',
        category: 'Form',
        description: 'Grouped Mantine buttons with shared borders.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                orientation: { type: 'string', enum: ['horizontal', 'vertical'] }
            }
        },
        defaultChildren: [
            {
                id: 'button-group-item',
                type: 'Button',
                props: {
                    children: 'Button'
                }
            }
        ],
        allowedChildren: ['Button', 'ButtonGroupSection']
    },
    {
        type: 'ButtonGroupSection',
        displayName: 'Button Group Section',
        category: 'Form',
        description: 'Non-button section inside a Mantine Button group.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Section'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ActionIcon',
        displayName: 'Action Icon',
        category: 'Form',
        description: 'Compact icon-sized button for toolbar and inline actions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                children: stringSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'subtle', 'default', 'transparent', 'white'] },
                color: colorSchema,
                size: sizeSchema,
                radius: sizeSchema,
                disabled: booleanSchema,
                loading: booleanSchema
            }
        },
        defaultProps: {
            label: 'Action',
            children: '+',
            variant: 'subtle'
        },
        allowedChildren: ['Icon', 'ThemeIcon', 'Text'],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS],
        aiHints: {
            purpose: 'Triggers compact toolbar or inline actions. Always provide an accessible label.',
            copyFields: ['label', 'children']
        }
    },
    {
        type: 'ActionIconGroup',
        displayName: 'Action Icon Group',
        category: 'Form',
        description: 'Grouped icon buttons for compact toolbars.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                orientation: { type: 'string', enum: ['horizontal', 'vertical'] }
            }
        },
        defaultChildren: [
            {
                id: 'action-icon-group-item',
                type: 'ActionIcon',
                props: {
                    label: 'Action',
                    children: '+'
                }
            }
        ],
        allowedChildren: ['ActionIcon', 'ActionIconGroupSection']
    },
    {
        type: 'ActionIconGroupSection',
        displayName: 'Action Icon Group Section',
        category: 'Form',
        description: 'Section inside an ActionIcon group.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: '+'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'UnstyledButton',
        displayName: 'Unstyled Button',
        category: 'Form',
        description: 'Button reset for fully custom clickable surfaces.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                component: { type: 'string', enum: ['button', 'a', 'div'] },
                href: stringSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Unstyled button',
            component: 'button'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'Burger',
        displayName: 'Burger',
        category: 'Form',
        description: 'Menu toggle button.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                size: sizeSchema,
                color: colorSchema,
                disabled: booleanSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            opened: false,
            label: 'Toggle navigation'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'CloseButton',
        displayName: 'Close Button',
        category: 'Form',
        description: 'Compact close/dismiss button.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                size: sizeSchema,
                radius: sizeSchema,
                variant: { type: 'string', enum: ['subtle', 'transparent', 'default'] },
                disabled: booleanSchema
            }
        },
        defaultProps: {
            'aria-label': 'Close'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'CopyButton',
        displayName: 'Copy Button',
        category: 'Form',
        description: 'Button that copies a configured text value.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: stringSchema,
                children: stringSchema,
                copiedLabel: stringSchema,
                timeout: integerSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'subtle', 'default', 'transparent', 'white'] },
                color: colorSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            value: 'Copied text',
            children: 'Copy',
            copiedLabel: 'Copied',
            timeout: 1200,
            variant: 'light'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'Input',
        displayName: 'Input',
        category: 'Form',
        description: 'Low-level Mantine input control for custom field composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                placeholder: stringSchema,
                defaultValue: stringSchema,
                type: { type: 'string', enum: ['text', 'email', 'password', 'url', 'tel', 'search'] },
                disabled: booleanSchema,
                readOnly: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'input',
            placeholder: 'Input',
            type: 'text'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'InputBase',
        displayName: 'Input Base',
        category: 'Form',
        description: 'Mantine InputBase for building custom input-like controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                placeholder: stringSchema,
                defaultValue: stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'input-base',
            label: 'Input base',
            placeholder: 'Input base'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'InputWrapper',
        displayName: 'Input Wrapper',
        category: 'Form',
        description: 'Mantine input wrapper for composing labels, descriptions, errors, and custom controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                id: stringSchema,
                label: stringSchema,
                description: stringSchema,
                error: stringSchema,
                required: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            label: 'Input wrapper'
        },
        defaultChildren: [
            {
                id: 'input-wrapper-control',
                type: 'Input',
                props: {
                    placeholder: 'Input'
                }
            }
        ],
        allowedChildren: ['Input', 'InputBase', 'InputLabel', 'InputDescription', 'InputPlaceholder', 'InputClearButton', 'InputError', 'TextInput', 'PasswordInput', 'Textarea', 'Select', 'MultiSelect', 'NativeSelect', 'Group', 'Stack']
    },
    {
        type: 'InputLabel',
        displayName: 'Input Label',
        category: 'Form',
        description: 'Label element inside a custom Mantine input composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                htmlFor: stringSchema,
                required: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            children: 'Input label'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'InputDescription',
        displayName: 'Input Description',
        category: 'Form',
        description: 'Description text inside a custom Mantine input composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            children: 'Input description'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'InputPlaceholder',
        displayName: 'Input Placeholder',
        category: 'Form',
        description: 'Placeholder content inside a custom Mantine input composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Placeholder'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'InputClearButton',
        displayName: 'Input Clear Button',
        category: 'Form',
        description: 'Clear button affordance inside a custom input.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            'aria-label': 'Clear input'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'InputError',
        displayName: 'Input Error',
        category: 'Form',
        description: 'Error text inside a custom Mantine input composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            children: 'Input error'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
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
        type: 'Autocomplete',
        displayName: 'Autocomplete',
        category: 'Form',
        description: 'Text input with suggestion data.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                data: stringArraySchema,
                defaultValue: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                readOnly: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'autocomplete',
            label: 'Autocomplete',
            data: ['Option 1', 'Option 2']
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
        type: 'PasswordInput',
        displayName: 'Password Input',
        category: 'Form',
        description: 'Password field with optional visibility control in Mantine renderers.',
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
                visible: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'password',
            label: 'Password'
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
        type: 'MultiSelect',
        displayName: 'Multi Select',
        category: 'Form',
        description: 'Multi-value selection field with canonical JSON options.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                data: optionArraySchema,
                defaultValue: stringArraySchema,
                searchable: booleanSchema,
                clearable: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'multi-select',
            label: 'Multi select',
            data: [
                { label: 'Option 1', value: 'option-1' },
                { label: 'Option 2', value: 'option-2' }
            ],
            defaultValue: []
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
        type: 'NativeSelect',
        displayName: 'Native Select',
        category: 'Form',
        description: 'Native select field with Builder JSON options.',
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
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'native-select',
            label: 'Native select',
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
        type: 'Combobox',
        displayName: 'Combobox',
        category: 'Form',
        description: 'Composable Mantine combobox root with target, dropdown, search, groups, and options.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                opened: booleanSchema,
                disabled: booleanSchema,
                position: { type: 'string', enum: ['top', 'right', 'bottom', 'left', 'top-start', 'top-end', 'bottom-start', 'bottom-end'] },
                width: { type: ['string', 'number'] },
                shadow: { type: 'string', enum: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
                withinPortal: booleanSchema
            }
        },
        defaultProps: {
            label: 'Combobox',
            position: 'bottom',
            shadow: 'md'
        },
        defaultChildren: [
            {
                id: 'combobox-target',
                type: 'ComboboxTarget'
            },
            {
                id: 'combobox-dropdown',
                type: 'ComboboxDropdown'
            }
        ],
        allowedChildren: ['ComboboxTarget', 'ComboboxDropdownTarget', 'ComboboxEventsTarget', 'ComboboxDropdown', 'ComboboxOptions', 'ComboboxOption', 'ComboboxSearch', 'ComboboxEmpty', 'ComboboxGroup', 'ComboboxHeader', 'ComboboxFooter', 'ComboboxChevron', 'ComboboxClearButton', 'ComboboxHiddenInput'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ComboboxTarget',
        displayName: 'Combobox Target',
        category: 'Form',
        description: 'Clickable target inside a Mantine Combobox.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'combobox-target-button',
                type: 'Button',
                props: {
                    children: 'Choose option',
                    variant: 'default'
                }
            }
        ],
        allowedChildren: ['Button', 'ActionIcon', 'Input', 'InputBase', 'TextInput', 'Group', 'Text']
    },
    {
        type: 'ComboboxDropdownTarget',
        displayName: 'Combobox Dropdown Target',
        category: 'Form',
        description: 'Input-like dropdown target inside a Mantine Combobox.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'combobox-dropdown-target-input',
                type: 'InputBase',
                props: {
                    placeholder: 'Search option'
                }
            }
        ],
        allowedChildren: ['Input', 'InputBase', 'TextInput', 'Group']
    },
    {
        type: 'ComboboxEventsTarget',
        displayName: 'Combobox Events Target',
        category: 'Form',
        description: 'Events-only target used for custom Combobox controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'combobox-events-target-input',
                type: 'InputBase',
                props: {
                    placeholder: 'Custom target'
                }
            }
        ],
        allowedChildren: ['Input', 'InputBase', 'TextInput', 'Group']
    },
    {
        type: 'ComboboxDropdown',
        displayName: 'Combobox Dropdown',
        category: 'Form',
        description: 'Dropdown content region inside a Mantine Combobox.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'combobox-options',
                type: 'ComboboxOptions'
            }
        ],
        allowedChildren: ['ComboboxHeader', 'ComboboxSearch', 'ComboboxOptions', 'ComboboxOption', 'ComboboxGroup', 'ComboboxEmpty', 'ComboboxFooter']
    },
    {
        type: 'ComboboxOptions',
        displayName: 'Combobox Options',
        category: 'Form',
        description: 'Options list inside a Mantine Combobox dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'combobox-option',
                type: 'ComboboxOption',
                props: {
                    value: 'option-1',
                    children: 'Option 1'
                }
            }
        ],
        allowedChildren: ['ComboboxOption', 'ComboboxGroup', 'ComboboxEmpty']
    },
    {
        type: 'ComboboxOption',
        displayName: 'Combobox Option',
        category: 'Form',
        description: 'Single selectable option inside a Mantine Combobox.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['value'],
            properties: {
                value: stringSchema,
                children: stringSchema,
                disabled: booleanSchema,
                active: booleanSchema,
                selected: booleanSchema
            }
        },
        defaultProps: {
            value: 'option',
            children: 'Option'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ComboboxSearch',
        displayName: 'Combobox Search',
        category: 'Form',
        description: 'Search input inside a Mantine Combobox dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                placeholder: stringSchema,
                defaultValue: stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'combobox-search',
            placeholder: 'Search'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ComboboxEmpty',
        displayName: 'Combobox Empty',
        category: 'Form',
        description: 'Empty-state content inside a Mantine Combobox options list.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'No options'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ComboboxGroup',
        displayName: 'Combobox Group',
        category: 'Form',
        description: 'Grouped Combobox options under a label.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema
            }
        },
        defaultProps: {
            label: 'Group'
        },
        defaultChildren: [
            {
                id: 'combobox-group-option',
                type: 'ComboboxOption',
                props: {
                    value: 'group-option',
                    children: 'Grouped option'
                }
            }
        ],
        allowedChildren: ['ComboboxOption']
    },
    {
        type: 'ComboboxHeader',
        displayName: 'Combobox Header',
        category: 'Form',
        description: 'Header content inside a Mantine Combobox dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Combobox header'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ComboboxFooter',
        displayName: 'Combobox Footer',
        category: 'Form',
        description: 'Footer content inside a Mantine Combobox dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Combobox footer'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ComboboxChevron',
        displayName: 'Combobox Chevron',
        category: 'Form',
        description: 'Dropdown chevron affordance for custom Combobox targets.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: sizeSchema,
                error: booleanSchema
            }
        },
        allowedChildren: []
    },
    {
        type: 'ComboboxClearButton',
        displayName: 'Combobox Clear Button',
        category: 'Form',
        description: 'Clear button affordance for custom Combobox targets.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            'aria-label': 'Clear combobox'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'ComboboxHiddenInput',
        displayName: 'Combobox Hidden Input',
        category: 'Form',
        description: 'Hidden input used to submit Combobox values in forms.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                value: stringSchema,
                values: stringArraySchema
            }
        },
        defaultProps: {
            name: 'combobox-value',
            value: 'option'
        },
        allowedChildren: []
    },
    {
        type: 'CheckboxGroup',
        displayName: 'Checkbox Group',
        category: 'Form',
        description: 'Grouped checkbox options composed from Checkbox or CheckboxCard children.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                defaultValue: stringArraySchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'checkbox-group',
            label: 'Checkbox group',
            defaultValue: []
        },
        defaultChildren: [
            {
                id: 'checkbox-group-option',
                type: 'Checkbox',
                props: {
                    label: 'Option',
                    value: 'option'
                }
            }
        ],
        allowedChildren: ['Checkbox', 'CheckboxCard', 'Stack', 'Group'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
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
                value: stringSchema,
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
        type: 'CheckboxCard',
        displayName: 'Checkbox Card',
        category: 'Form',
        description: 'Card-style boolean checkbox option.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                value: stringSchema,
                defaultChecked: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                radius: sizeSchema,
                withBorder: booleanSchema
            }
        },
        defaultProps: {
            name: 'checkbox-card',
            label: 'Checkbox card',
            value: 'value',
            defaultChecked: false,
            withBorder: true
        },
        allowedChildren: ['Text', 'Group', 'Stack', 'Icon', 'ThemeIcon'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'CheckboxIndicator',
        displayName: 'Checkbox Indicator',
        category: 'Form',
        description: 'Readonly checkbox indicator for custom option layouts.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                checked: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            checked: true
        },
        allowedChildren: []
    },
    {
        type: 'SwitchGroup',
        displayName: 'Switch Group',
        category: 'Form',
        description: 'Grouped switch options composed from Switch children.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                defaultValue: stringArraySchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'switch-group',
            label: 'Switch group',
            defaultValue: []
        },
        defaultChildren: [
            {
                id: 'switch-group-option',
                type: 'Switch',
                props: {
                    label: 'Option',
                    value: 'option'
                }
            }
        ],
        allowedChildren: ['Switch', 'Stack', 'Group'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'Switch',
        displayName: 'Switch',
        category: 'Form',
        description: 'Boolean toggle field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                value: stringSchema,
                defaultChecked: booleanSchema,
                onLabel: stringSchema,
                offLabel: stringSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'switch',
            label: 'Switch',
            defaultChecked: false
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS],
        slots: {
            thumbIcon: {
                displayName: 'Thumb Icon',
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
        type: 'Radio',
        displayName: 'Radio',
        category: 'Form',
        description: 'Single radio input, useful inside custom radio groups.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                value: stringSchema,
                defaultChecked: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'radio',
            label: 'Radio',
            value: 'value'
        },
        allowedChildren: ['PillGroup', 'Pill', 'PillsInputField'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'RadioCard',
        displayName: 'Radio Card',
        category: 'Form',
        description: 'Card-style single-choice radio option.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                value: stringSchema,
                defaultChecked: booleanSchema,
                required: booleanSchema,
                disabled: booleanSchema,
                radius: sizeSchema,
                withBorder: booleanSchema
            }
        },
        defaultProps: {
            name: 'radio-card',
            label: 'Radio card',
            value: 'value',
            withBorder: true
        },
        allowedChildren: ['Text', 'Group', 'Stack', 'Icon', 'ThemeIcon'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'RadioIndicator',
        displayName: 'Radio Indicator',
        category: 'Form',
        description: 'Readonly radio indicator for custom option layouts.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                checked: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            checked: true
        },
        allowedChildren: []
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
        type: 'Chip',
        displayName: 'Chip',
        category: 'Form',
        description: 'Compact selectable chip.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                value: stringSchema,
                checked: booleanSchema,
                defaultChecked: booleanSchema,
                variant: { type: 'string', enum: ['filled', 'outline', 'light'] },
                color: colorSchema,
                size: sizeSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Chip',
            value: 'chip',
            variant: 'filled'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ChipGroup',
        displayName: 'Chip Group',
        category: 'Form',
        description: 'Grouped chip options for single or multiple selection.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                multiple: booleanSchema,
                defaultValue: {
                    type: ['string', 'array'],
                    items: { type: 'string' }
                },
                disabled: booleanSchema
            }
        },
        defaultProps: {
            name: 'chip-group',
            label: 'Chip group',
            multiple: false
        },
        defaultChildren: [
            {
                id: 'chip-group-option',
                type: 'Chip',
                props: {
                    children: 'Option',
                    value: 'option'
                }
            }
        ],
        allowedChildren: ['Chip', 'Group', 'Stack'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'Slider',
        displayName: 'Slider',
        category: 'Form',
        description: 'Single-value numeric slider.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                defaultValue: numberSchema,
                min: numberSchema,
                max: numberSchema,
                step: numberSchema,
                marks: metricArraySchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'slider',
            label: 'Slider',
            defaultValue: 50,
            min: 0,
            max: 100,
            step: 1
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'RangeSlider',
        displayName: 'Range Slider',
        category: 'Form',
        description: 'Two-value numeric range slider.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                defaultValue: numberArraySchema,
                min: numberSchema,
                max: numberSchema,
                step: numberSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'range-slider',
            label: 'Range slider',
            defaultValue: [20, 80],
            min: 0,
            max: 100,
            step: 1
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'SegmentedControl',
        displayName: 'Segmented Control',
        category: 'Form',
        description: 'Compact segmented selection control.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                data: optionArraySchema,
                defaultValue: stringSchema,
                fullWidth: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'segmented-control',
            label: 'Segmented control',
            data: [
                { label: 'One', value: 'one' },
                { label: 'Two', value: 'two' }
            ],
            defaultValue: 'one'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'PinInput',
        displayName: 'Pin Input',
        category: 'Form',
        description: 'Separated one-time-code input.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                length: integerSchema,
                defaultValue: stringSchema,
                placeholder: stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'pin',
            label: 'Pin input',
            length: 4
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ColorInput',
        displayName: 'Color Input',
        category: 'Form',
        description: 'Text input with color picker affordance.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                placeholder: stringSchema,
                defaultValue: colorSchema,
                format: { type: 'string', enum: ['hex', 'hexa', 'rgb', 'rgba', 'hsl', 'hsla'] },
                swatches: stringArraySchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'color',
            label: 'Color input',
            defaultValue: '#228be6',
            format: 'hex'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ColorPicker',
        displayName: 'Color Picker',
        category: 'Form',
        description: 'Inline color picker.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                defaultValue: colorSchema,
                format: { type: 'string', enum: ['hex', 'hexa', 'rgb', 'rgba', 'hsl', 'hsla'] },
                swatches: stringArraySchema,
                withPicker: booleanSchema,
                fullWidth: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'color-picker',
            defaultValue: '#228be6',
            format: 'hex',
            withPicker: true
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'HueSlider',
        displayName: 'Hue Slider',
        category: 'Form',
        description: 'Hue-only slider for custom color picking experiences.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                defaultValue: numberSchema,
                min: numberSchema,
                max: numberSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'hue',
            defaultValue: 220,
            min: 0,
            max: 360
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'AlphaSlider',
        displayName: 'Alpha Slider',
        category: 'Form',
        description: 'Alpha-channel slider for custom color picking experiences.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                color: colorSchema,
                defaultValue: numberSchema,
                min: numberSchema,
                max: numberSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'alpha',
            color: '#228be6',
            defaultValue: 1,
            min: 0,
            max: 1
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'AngleSlider',
        displayName: 'Angle Slider',
        category: 'Form',
        description: 'Circular angle slider for custom directional controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                defaultValue: numberSchema,
                min: numberSchema,
                max: numberSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'angle',
            defaultValue: 90,
            min: 0,
            max: 360
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'ColorSwatch',
        displayName: 'Color Swatch',
        category: 'Form',
        description: 'Static color swatch that can be used in palettes and controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                color: colorSchema,
                size: { type: ['string', 'number'] },
                radius: sizeSchema,
                withShadow: booleanSchema
            }
        },
        defaultProps: {
            color: '#228be6',
            size: 28,
            radius: 'xl',
            withShadow: true
        },
        allowedChildren: ['Icon', 'Text']
    },
    {
        type: 'JsonInput',
        displayName: 'JSON Input',
        category: 'Form',
        description: 'Textarea-like JSON editor field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                defaultValue: stringSchema,
                minRows: integerSchema,
                maxRows: integerSchema,
                autosize: booleanSchema,
                formatOnBlur: booleanSchema,
                validationError: stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'json',
            label: 'JSON input',
            defaultValue: '{\\n  \"key\": \"value\"\\n}',
            minRows: 4,
            formatOnBlur: true
        },
        uiSchema: {
            defaultValue: {
                'ui:widget': 'textarea',
                'ui:options': multilineTextUiOptions
            }
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'TagsInput',
        displayName: 'Tags Input',
        category: 'Form',
        description: 'Free-form tag entry field.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                data: stringArraySchema,
                defaultValue: stringArraySchema,
                clearable: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'tags',
            label: 'Tags input',
            placeholder: 'Add tag',
            data: ['alpha', 'beta'],
            defaultValue: []
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'FileInput',
        displayName: 'File Input',
        category: 'Form',
        description: 'File picker field. Saved props describe the picker, not selected local files.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                placeholder: stringSchema,
                description: stringSchema,
                accept: stringSchema,
                multiple: booleanSchema,
                clearable: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'file',
            label: 'File input',
            placeholder: 'Select file'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'FileButton',
        displayName: 'File Button',
        category: 'Form',
        description: 'Button-style file picker. Saved props describe accepted files, not selected local files.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                accept: stringSchema,
                multiple: booleanSchema,
                resetRef: stringSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'subtle', 'default', 'transparent', 'white'] },
                color: colorSchema,
                size: sizeSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Select file',
            variant: 'light'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'PillsInput',
        displayName: 'Pills Input',
        category: 'Form',
        description: 'Pill-based input display backed by a JSON string array.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                description: stringSchema,
                placeholder: stringSchema,
                values: stringArraySchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'pills',
            label: 'Pills input',
            values: ['Alpha', 'Beta']
        },
        allowedChildren: ['PillGroup', 'Pill', 'PillsInputField'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'PillsInputField',
        displayName: 'Pills Input Field',
        category: 'Form',
        description: 'Text field area inside a Mantine PillsInput.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                placeholder: stringSchema,
                defaultValue: stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'pills-field',
            placeholder: 'Add item'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'Fieldset',
        displayName: 'Fieldset',
        category: 'Form',
        description: 'Semantic form group with legend and description.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                legend: stringSchema,
                variant: { type: 'string', enum: ['default', 'filled', 'unstyled'] },
                radius: sizeSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            legend: 'Fieldset',
            variant: 'default'
        },
        allowedChildren: [...Builder_FORM_FIELD_TYPES]
    },
    {
        type: 'Rating',
        displayName: 'Rating',
        category: 'Form',
        description: 'Star rating input or display control.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                name: stringSchema,
                label: stringSchema,
                defaultValue: numberSchema,
                count: integerSchema,
                fractions: integerSchema,
                readOnly: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            name: 'rating',
            label: 'Rating',
            defaultValue: 3,
            count: 5
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
                allowedChildren: ['Button', 'ActionIcon', 'Group']
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
        allowedChildren: ['TableCaption', 'TableThead', 'TableTbody', 'TableTfoot', 'TableTr'],
        aiHints: {
            purpose: 'Shows structured records in columns. Prefer node.data.sourceId and node.data.repeat for dynamic rows.',
            dataBinding: 'Bind rows from node.data.repeat.sourceId and map columns through node.data.fields.'
        }
    },
    {
        type: 'TableCaption',
        displayName: 'Table Caption',
        category: 'Data Display',
        description: 'Accessible caption for a Mantine Table.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Table caption'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'TableThead',
        displayName: 'Table Head',
        category: 'Data Display',
        description: 'Header section inside a Mantine Table.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'table-head-row',
                type: 'TableTr',
                children: [
                    {
                        id: 'table-head-cell',
                        type: 'TableTh',
                        props: {
                            children: 'Column'
                        }
                    }
                ]
            }
        ],
        allowedChildren: ['TableTr']
    },
    {
        type: 'TableTbody',
        displayName: 'Table Body',
        category: 'Data Display',
        description: 'Body section inside a Mantine Table.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'table-body-row',
                type: 'TableTr',
                children: [
                    {
                        id: 'table-body-cell',
                        type: 'TableTd',
                        props: {
                            children: 'Cell'
                        }
                    }
                ]
            }
        ],
        allowedChildren: ['TableTr']
    },
    {
        type: 'TableTfoot',
        displayName: 'Table Foot',
        category: 'Data Display',
        description: 'Footer section inside a Mantine Table.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['TableTr']
    },
    {
        type: 'TableTr',
        displayName: 'Table Row',
        category: 'Data Display',
        description: 'Row inside a Mantine Table section.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'table-row-cell',
                type: 'TableTd',
                props: {
                    children: 'Cell'
                }
            }
        ],
        allowedChildren: ['TableTh', 'TableTd']
    },
    {
        type: 'TableTh',
        displayName: 'Table Header Cell',
        category: 'Data Display',
        description: 'Header cell inside a Mantine Table row.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                colSpan: integerSchema,
                rowSpan: integerSchema,
                scope: { type: 'string', enum: ['col', 'row', 'colgroup', 'rowgroup'] }
            }
        },
        defaultProps: {
            children: 'Column',
            scope: 'col'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'TableTd',
        displayName: 'Table Cell',
        category: 'Data Display',
        description: 'Data cell inside a Mantine Table row.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                colSpan: integerSchema,
                rowSpan: integerSchema
            }
        },
        defaultProps: {
            children: 'Cell'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
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
        type: 'Accordion',
        displayName: 'Accordion',
        category: 'Data Display',
        description: 'Expandable list of sections backed by JSON items or child nodes.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                items: accordionItemArraySchema,
                defaultValue: stringSchema,
                variant: { type: 'string', enum: ['default', 'contained', 'filled', 'separated'] },
                multiple: booleanSchema,
                radius: sizeSchema,
                chevronPosition: { type: 'string', enum: ['left', 'right'] }
            }
        },
        defaultProps: {
            variant: 'separated',
            multiple: false,
            items: [
                { label: 'First item', value: 'item-1', content: 'Accordion content' },
                { label: 'Second item', value: 'item-2', content: 'More content' }
            ]
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN]
    },
    {
        type: 'AccordionItem',
        displayName: 'Accordion Item',
        category: 'Data Display',
        description: 'Container item inside a Mantine Accordion.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: stringSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            value: 'item-1'
        },
        defaultChildren: [
            {
                id: 'accordion-item-control',
                type: 'AccordionControl',
                props: {
                    children: 'Accordion item'
                }
            },
            {
                id: 'accordion-item-panel',
                type: 'AccordionPanel',
                props: {
                    children: 'Accordion content'
                }
            }
        ],
        allowedChildren: ['AccordionControl', 'AccordionPanel']
    },
    {
        type: 'AccordionControl',
        displayName: 'Accordion Control',
        category: 'Data Display',
        description: 'Clickable heading control for an Accordion item.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                disabled: booleanSchema,
                icon: stringSchema
            }
        },
        defaultProps: {
            children: 'Accordion item'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'AccordionPanel',
        displayName: 'Accordion Panel',
        category: 'Data Display',
        description: 'Expandable content panel for an Accordion item.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Accordion content'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Timeline',
        displayName: 'Timeline',
        category: 'Data Display',
        description: 'Vertical sequence of events or milestones.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                items: timelineItemArraySchema,
                active: integerSchema,
                color: colorSchema,
                bulletSize: integerSchema,
                lineWidth: integerSchema
            }
        },
        defaultProps: {
            active: 1,
            color: 'blue',
            bulletSize: 24,
            lineWidth: 2,
            items: [
                { title: 'Created', description: 'Initial step', time: 'Today' },
                { title: 'Reviewed', description: 'Quality check', time: 'Next' }
            ]
        },
        allowedChildren: []
    },
    {
        type: 'TimelineItem',
        displayName: 'Timeline Item',
        category: 'Data Display',
        description: 'Single event or milestone inside a Timeline.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                children: stringSchema,
                color: colorSchema,
                bullet: stringSchema,
                lineVariant: { type: 'string', enum: ['solid', 'dashed', 'dotted'] }
            }
        },
        defaultProps: {
            title: 'Timeline item',
            children: 'Timeline content'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Tree',
        displayName: 'Tree',
        category: 'Data Display',
        description: 'Hierarchical tree view backed by JSON nodes.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                data: treeNodeArraySchema,
                levelOffset: integerSchema,
                expandOnClick: booleanSchema,
                selectOnClick: booleanSchema
            }
        },
        defaultProps: {
            data: [
                {
                    label: 'Root',
                    value: 'root',
                    children: [
                        { label: 'Child', value: 'child' }
                    ]
                }
            ],
            expandOnClick: true,
            selectOnClick: true
        },
        allowedChildren: []
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
        type: 'Menu',
        displayName: 'Menu',
        category: 'Navigation',
        description: 'Dropdown menu with canonical JSON items.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                items: menuItemArraySchema,
                trigger: { type: 'string', enum: ['click', 'hover'] },
                position: { type: 'string', enum: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end', 'left', 'right'] },
                withArrow: booleanSchema,
                width: { type: ['string', 'number'] }
            }
        },
        defaultProps: {
            label: 'Menu',
            trigger: 'click',
            position: 'bottom-start',
            items: [
                { label: 'Profile', href: '#' },
                { label: 'Settings', href: '#' }
            ]
        },
        allowedChildren: ['MenuTarget', 'MenuDropdown'],
        allowedEvents: [...Builder_LINK_ALLOWED_EVENTS]
    },
    {
        type: 'MenuTarget',
        displayName: 'Menu Target',
        category: 'Navigation',
        description: 'Trigger target inside a Mantine Menu.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultChildren: [
            {
                id: 'menu-target-button',
                type: 'Button',
                props: {
                    children: 'Menu'
                }
            }
        ],
        allowedChildren: [...Builder_ACTION_SLOT_CHILDREN]
    },
    {
        type: 'MenuDropdown',
        displayName: 'Menu Dropdown',
        category: 'Navigation',
        description: 'Dropdown content region inside a Mantine Menu.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'menu-item',
                type: 'MenuItem',
                props: {
                    children: 'Menu item'
                }
            }
        ],
        allowedChildren: ['MenuItem', 'MenuLabel', 'MenuDivider', 'Text', 'Divider', 'Anchor', 'Button']
    },
    {
        type: 'MenuItem',
        displayName: 'Menu Item',
        category: 'Navigation',
        description: 'Action or link row inside a Mantine Menu dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                href: stringSchema,
                color: colorSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: 'Menu item'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN],
        allowedEvents: [...Builder_LINK_ALLOWED_EVENTS]
    },
    {
        type: 'MenuLabel',
        displayName: 'Menu Label',
        category: 'Navigation',
        description: 'Non-interactive section label inside a Mantine Menu dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Section'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'MenuDivider',
        displayName: 'Menu Divider',
        category: 'Navigation',
        description: 'Divider line inside a Mantine Menu dropdown.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
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
    },
    {
        type: 'TabsList',
        displayName: 'Tabs List',
        category: 'Navigation',
        description: 'Tab button list inside Mantine Tabs.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                grow: booleanSchema,
                justify: { type: 'string', enum: ['flex-start', 'center', 'flex-end', 'space-between'] }
            }
        },
        defaultChildren: [
            {
                id: 'tabs-tab',
                type: 'TabsTab',
                props: {
                    value: 'tab-1',
                    children: 'Tab'
                }
            }
        ],
        allowedChildren: ['TabsTab']
    },
    {
        type: 'TabsTab',
        displayName: 'Tabs Tab',
        category: 'Navigation',
        description: 'Single selectable tab inside a Mantine Tabs list.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: stringSchema,
                children: stringSchema,
                disabled: booleanSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            value: 'tab-1',
            children: 'Tab'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'TabsPanel',
        displayName: 'Tabs Panel',
        category: 'Navigation',
        description: 'Content panel associated with a Mantine Tabs tab value.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: stringSchema,
                children: stringSchema,
                keepMounted: booleanSchema
            }
        },
        defaultProps: {
            value: 'tab-1',
            children: 'Tab panel content'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Stepper',
        displayName: 'Stepper',
        category: 'Navigation',
        description: 'Progressive multi-step navigation indicator.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                steps: stepperStepArraySchema,
                active: integerSchema,
                orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
                iconPosition: { type: 'string', enum: ['left', 'right'] },
                size: sizeSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            active: 1,
            orientation: 'horizontal',
            steps: [
                { label: 'First step', description: 'Start here', content: 'Step one content' },
                { label: 'Second step', description: 'Continue', content: 'Step two content' }
            ]
        },
        allowedChildren: ['StepperStep', 'StepperCompleted']
    },
    {
        type: 'StepperStep',
        displayName: 'Stepper Step',
        category: 'Navigation',
        description: 'Single step inside a Mantine Stepper.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                description: stringSchema,
                children: stringSchema,
                disabled: booleanSchema,
                loading: booleanSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            label: 'Step',
            description: 'Step description',
            children: 'Step content'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'StepperCompleted',
        displayName: 'Stepper Completed',
        category: 'Navigation',
        description: 'Completion content shown after the final step.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Completed'
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Pagination',
        displayName: 'Pagination',
        category: 'Navigation',
        description: 'Page navigation control for paged content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                total: integerSchema,
                defaultValue: integerSchema,
                siblings: integerSchema,
                boundaries: integerSchema,
                withEdges: booleanSchema,
                disabled: booleanSchema,
                size: sizeSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            total: 10,
            defaultValue: 1,
            siblings: 1,
            boundaries: 1
        },
        allowedChildren: [],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'PaginationRoot',
        displayName: 'Pagination Root',
        category: 'Navigation',
        description: 'Composable root for Mantine Pagination subcomponents.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                total: integerSchema,
                defaultValue: integerSchema,
                siblings: integerSchema,
                boundaries: integerSchema,
                disabled: booleanSchema,
                size: sizeSchema,
                color: colorSchema
            }
        },
        defaultProps: {
            total: 10,
            defaultValue: 1
        },
        defaultChildren: [
            {
                id: 'pagination-items',
                type: 'PaginationItems'
            }
        ],
        allowedChildren: ['PaginationFirst', 'PaginationPrevious', 'PaginationItems', 'PaginationNext', 'PaginationLast', 'PaginationControl', 'PaginationDots'],
        allowedEvents: [...Builder_FIELD_ALLOWED_EVENTS]
    },
    {
        type: 'PaginationControl',
        displayName: 'Pagination Control',
        category: 'Navigation',
        description: 'Single page control inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                active: booleanSchema,
                disabled: booleanSchema
            }
        },
        defaultProps: {
            children: '1'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'PaginationDots',
        displayName: 'Pagination Dots',
        category: 'Navigation',
        description: 'Ellipsis marker inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'PaginationFirst',
        displayName: 'Pagination First',
        category: 'Navigation',
        description: 'First page control inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'PaginationItems',
        displayName: 'Pagination Items',
        category: 'Navigation',
        description: 'Automatically generated page item controls inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'PaginationLast',
        displayName: 'Pagination Last',
        category: 'Navigation',
        description: 'Last page control inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'PaginationNext',
        displayName: 'Pagination Next',
        category: 'Navigation',
        description: 'Next page control inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'PaginationPrevious',
        displayName: 'Pagination Previous',
        category: 'Navigation',
        description: 'Previous page control inside PaginationRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'TableOfContents',
        displayName: 'Table Of Contents',
        category: 'Navigation',
        description: 'Document outline or section jump list.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                items: tocItemArraySchema,
                variant: { type: 'string', enum: ['light', 'filled'] },
                color: colorSchema,
                size: sizeSchema,
                radius: sizeSchema
            }
        },
        defaultProps: {
            items: [
                { label: 'Overview', href: '#overview', active: true },
                { label: 'Details', href: '#details' }
            ],
            variant: 'light'
        },
        allowedChildren: ['Anchor', 'NavLink', 'Text']
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
        type: 'ModalRoot',
        displayName: 'Modal Root',
        category: 'Overlay',
        description: 'Composable root for Mantine Modal subcomponents.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                size: sizeSchema,
                centered: booleanSchema,
                closeOnClickOutside: booleanSchema
            }
        },
        defaultProps: {
            opened: false,
            size: 'md',
            centered: true
        },
        defaultChildren: [
            { id: 'modal-overlay', type: 'ModalOverlay' },
            {
                id: 'modal-content',
                type: 'ModalContent',
                children: [
                    {
                        id: 'modal-header',
                        type: 'ModalHeader'
                    },
                    {
                        id: 'modal-body',
                        type: 'ModalBody'
                    }
                ]
            }
        ],
        allowedChildren: ['ModalOverlay', 'ModalContent', 'ModalHeader', 'ModalTitle', 'ModalCloseButton', 'ModalBody'],
        allowedEvents: [...Builder_OVERLAY_ALLOWED_EVENTS]
    },
    {
        type: 'ModalOverlay',
        displayName: 'Modal Overlay',
        category: 'Overlay',
        description: 'Backdrop overlay inside a ModalRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                backgroundOpacity: numberSchema,
                blur: numberSchema
            }
        },
        allowedChildren: []
    },
    {
        type: 'ModalContent',
        displayName: 'Modal Content',
        category: 'Overlay',
        description: 'Content surface inside a ModalRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['ModalHeader', 'ModalTitle', 'ModalCloseButton', 'ModalBody', 'Stack', 'Group', 'Text', 'Button']
    },
    {
        type: 'ModalHeader',
        displayName: 'Modal Header',
        category: 'Overlay',
        description: 'Header row inside a ModalContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'modal-title',
                type: 'ModalTitle'
            },
            {
                id: 'modal-close',
                type: 'ModalCloseButton'
            }
        ],
        allowedChildren: ['ModalTitle', 'ModalCloseButton', 'Group', 'Text']
    },
    {
        type: 'ModalTitle',
        displayName: 'Modal Title',
        category: 'Overlay',
        description: 'Title text inside a ModalHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Modal title'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ModalCloseButton',
        displayName: 'Modal Close Button',
        category: 'Overlay',
        description: 'Close button inside a ModalHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            'aria-label': 'Close modal'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'ModalBody',
        displayName: 'Modal Body',
        category: 'Overlay',
        description: 'Body content area inside a ModalContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'modal-body-text',
                type: 'Text',
                props: {
                    children: 'Modal content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'ModalStack',
        displayName: 'Modal Stack',
        category: 'Overlay',
        description: 'Mantine modal stack manager for multiple modal roots.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['ModalRoot', 'Modal']
    },
    {
        type: 'ModalBase',
        displayName: 'Modal Base',
        category: 'Overlay',
        description: 'Low-level Mantine modal primitive for custom overlay composition.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                centered: booleanSchema,
                closeOnClickOutside: booleanSchema,
                withinPortal: booleanSchema
            }
        },
        defaultProps: {
            opened: false,
            centered: true
        },
        defaultChildren: [
            { id: 'modal-base-overlay', type: 'ModalBaseOverlay' },
            {
                id: 'modal-base-content',
                type: 'ModalBaseContent',
                children: [
                    { id: 'modal-base-header', type: 'ModalBaseHeader' },
                    { id: 'modal-base-body', type: 'ModalBaseBody' }
                ]
            }
        ],
        allowedChildren: ['ModalBaseOverlay', 'ModalBaseContent', 'ModalBaseHeader', 'ModalBaseTitle', 'ModalBaseCloseButton', 'ModalBaseBody'],
        allowedEvents: [...Builder_OVERLAY_ALLOWED_EVENTS]
    },
    {
        type: 'ModalBaseOverlay',
        displayName: 'Modal Base Overlay',
        category: 'Overlay',
        description: 'Backdrop overlay inside a ModalBase.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                backgroundOpacity: numberSchema,
                blur: numberSchema
            }
        },
        allowedChildren: []
    },
    {
        type: 'ModalBaseContent',
        displayName: 'Modal Base Content',
        category: 'Overlay',
        description: 'Content surface inside a ModalBase.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['ModalBaseHeader', 'ModalBaseTitle', 'ModalBaseCloseButton', 'ModalBaseBody', 'Stack', 'Group', 'Text', 'Button']
    },
    {
        type: 'ModalBaseHeader',
        displayName: 'Modal Base Header',
        category: 'Overlay',
        description: 'Header row inside a ModalBaseContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            { id: 'modal-base-title', type: 'ModalBaseTitle' },
            { id: 'modal-base-close', type: 'ModalBaseCloseButton' }
        ],
        allowedChildren: ['ModalBaseTitle', 'ModalBaseCloseButton', 'Group', 'Text']
    },
    {
        type: 'ModalBaseTitle',
        displayName: 'Modal Base Title',
        category: 'Overlay',
        description: 'Title text inside a ModalBaseHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Modal base title'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'ModalBaseCloseButton',
        displayName: 'Modal Base Close Button',
        category: 'Overlay',
        description: 'Close button inside a ModalBaseHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            'aria-label': 'Close modal'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'ModalBaseBody',
        displayName: 'Modal Base Body',
        category: 'Overlay',
        description: 'Body content area inside a ModalBaseContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'modal-base-body-text',
                type: 'Text',
                props: {
                    children: 'Modal base content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
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
    },
    {
        type: 'DrawerRoot',
        displayName: 'Drawer Root',
        category: 'Overlay',
        description: 'Composable root for Mantine Drawer subcomponents.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                position: { type: 'string', enum: ['left', 'right', 'top', 'bottom'] },
                size: sizeSchema
            }
        },
        defaultProps: {
            opened: false,
            position: 'right',
            size: 'md'
        },
        defaultChildren: [
            { id: 'drawer-overlay', type: 'DrawerOverlay' },
            {
                id: 'drawer-content',
                type: 'DrawerContent',
                children: [
                    { id: 'drawer-header', type: 'DrawerHeader' },
                    { id: 'drawer-body', type: 'DrawerBody' }
                ]
            }
        ],
        allowedChildren: ['DrawerOverlay', 'DrawerContent', 'DrawerHeader', 'DrawerTitle', 'DrawerCloseButton', 'DrawerBody'],
        allowedEvents: [...Builder_OVERLAY_ALLOWED_EVENTS]
    },
    {
        type: 'DrawerOverlay',
        displayName: 'Drawer Overlay',
        category: 'Overlay',
        description: 'Backdrop overlay inside a DrawerRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                backgroundOpacity: numberSchema,
                blur: numberSchema
            }
        },
        allowedChildren: []
    },
    {
        type: 'DrawerContent',
        displayName: 'Drawer Content',
        category: 'Overlay',
        description: 'Content surface inside a DrawerRoot.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['DrawerHeader', 'DrawerTitle', 'DrawerCloseButton', 'DrawerBody', 'Stack', 'Group', 'Text', 'Button']
    },
    {
        type: 'DrawerHeader',
        displayName: 'Drawer Header',
        category: 'Overlay',
        description: 'Header row inside a DrawerContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            { id: 'drawer-title', type: 'DrawerTitle' },
            { id: 'drawer-close', type: 'DrawerCloseButton' }
        ],
        allowedChildren: ['DrawerTitle', 'DrawerCloseButton', 'Group', 'Text']
    },
    {
        type: 'DrawerTitle',
        displayName: 'Drawer Title',
        category: 'Overlay',
        description: 'Title text inside a DrawerHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: 'Drawer title'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'DrawerCloseButton',
        displayName: 'Drawer Close Button',
        category: 'Overlay',
        description: 'Close button inside a DrawerHeader.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                'aria-label': stringSchema,
                disabled: booleanSchema,
                size: sizeSchema
            }
        },
        defaultProps: {
            'aria-label': 'Close drawer'
        },
        allowedChildren: [],
        allowedEvents: [...Builder_BUTTON_ALLOWED_EVENTS]
    },
    {
        type: 'DrawerBody',
        displayName: 'Drawer Body',
        category: 'Overlay',
        description: 'Body content area inside a DrawerContent.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'drawer-body-text',
                type: 'Text',
                props: {
                    children: 'Drawer content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'DrawerStack',
        displayName: 'Drawer Stack',
        category: 'Overlay',
        description: 'Mantine drawer stack manager for multiple drawer roots.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: ['DrawerRoot', 'Drawer']
    },
    {
        type: 'Tooltip',
        displayName: 'Tooltip',
        category: 'Overlay',
        description: 'Hover or focus helper label around one child.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                position: { type: 'string', enum: ['top', 'right', 'bottom', 'left'] },
                color: colorSchema,
                withArrow: booleanSchema,
                multiline: booleanSchema
            }
        },
        defaultProps: {
            label: 'Tooltip',
            position: 'top',
            withArrow: true
        },
        allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text', 'Icon', 'ThemeIcon']
    },
    {
        type: 'TooltipFloating',
        displayName: 'Tooltip Floating',
        category: 'Overlay',
        description: 'Tooltip variant that follows the pointer while hovering a child.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                color: colorSchema,
                withArrow: booleanSchema,
                multiline: booleanSchema
            }
        },
        defaultProps: {
            label: 'Floating tooltip',
            withArrow: true
        },
        allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text', 'Icon', 'ThemeIcon']
    },
    {
        type: 'TooltipGroup',
        displayName: 'Tooltip Group',
        category: 'Overlay',
        description: 'Shared open and close delay settings for nested Tooltips.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                openDelay: integerSchema,
                closeDelay: integerSchema
            }
        },
        defaultProps: {
            openDelay: 100,
            closeDelay: 100
        },
        defaultChildren: [
            {
                id: 'tooltip-group-item',
                type: 'Tooltip',
                props: {
                    label: 'Tooltip'
                },
                children: [
                    {
                        id: 'tooltip-group-button',
                        type: 'Button',
                        props: {
                            children: 'Hover'
                        }
                    }
                ]
            }
        ],
        allowedChildren: ['Tooltip', 'TooltipFloating', 'Group', 'Stack']
    },
    {
        type: 'Popover',
        displayName: 'Popover',
        category: 'Overlay',
        description: 'Click-triggered floating panel with target and dropdown content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                opened: booleanSchema,
                position: { type: 'string', enum: ['top', 'right', 'bottom', 'left', 'top-start', 'top-end', 'bottom-start', 'bottom-end'] },
                withArrow: booleanSchema,
                width: { type: ['string', 'number'] },
                shadow: { type: 'string', enum: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] }
            }
        },
        defaultProps: {
            label: 'Open popover',
            position: 'bottom',
            withArrow: true,
            shadow: 'md'
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN],
        slots: {
            target: {
                displayName: 'Target',
                allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text']
            }
        }
    },
    {
        type: 'PopoverTarget',
        displayName: 'Popover Target',
        category: 'Overlay',
        description: 'Trigger target inside a Mantine Popover.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'popover-target-button',
                type: 'Button',
                props: {
                    children: 'Open popover'
                }
            }
        ],
        allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text', 'Icon', 'ThemeIcon']
    },
    {
        type: 'PopoverDropdown',
        displayName: 'Popover Dropdown',
        category: 'Overlay',
        description: 'Dropdown content region inside a Mantine Popover.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'popover-dropdown-text',
                type: 'Text',
                props: {
                    children: 'Popover content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'HoverCard',
        displayName: 'Hover Card',
        category: 'Overlay',
        description: 'Hover-triggered floating content panel.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                label: stringSchema,
                openDelay: integerSchema,
                closeDelay: integerSchema,
                position: { type: 'string', enum: ['top', 'right', 'bottom', 'left'] },
                withArrow: booleanSchema,
                width: { type: ['string', 'number'] },
                shadow: { type: 'string', enum: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] }
            }
        },
        defaultProps: {
            label: 'Hover card',
            openDelay: 100,
            closeDelay: 100,
            position: 'bottom',
            withArrow: true,
            shadow: 'md'
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN],
        slots: {
            target: {
                displayName: 'Target',
                allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text']
            }
        }
    },
    {
        type: 'HoverCardTarget',
        displayName: 'Hover Card Target',
        category: 'Overlay',
        description: 'Trigger target inside a Mantine HoverCard.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'hover-card-target',
                type: 'Anchor',
                props: {
                    children: 'Hover target',
                    href: '#'
                }
            }
        ],
        allowedChildren: ['Button', 'ActionIcon', 'Anchor', 'Badge', 'Text', 'Icon', 'ThemeIcon']
    },
    {
        type: 'HoverCardDropdown',
        displayName: 'Hover Card Dropdown',
        category: 'Overlay',
        description: 'Dropdown content region inside a Mantine HoverCard.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        defaultChildren: [
            {
                id: 'hover-card-dropdown-text',
                type: 'Text',
                props: {
                    children: 'Hover card content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Dialog',
        displayName: 'Dialog',
        category: 'Overlay',
        description: 'Floating non-modal dialog panel.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                opened: booleanSchema,
                position: objectSchema,
                size: sizeSchema,
                radius: sizeSchema,
                shadow: { type: 'string', enum: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
                withBorder: booleanSchema
            }
        },
        defaultProps: {
            opened: true,
            position: {
                bottom: 24,
                right: 24
            },
            size: 'md',
            shadow: 'md',
            withBorder: true
        },
        allowedChildren: [...Builder_LAYOUT_CHILDREN]
    },
    {
        type: 'Overlay',
        displayName: 'Overlay',
        category: 'Overlay',
        description: 'Visual overlay layer for dimming or emphasizing a region.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                color: colorSchema,
                backgroundOpacity: numberSchema,
                blur: numberSchema,
                fixed: booleanSchema,
                zIndex: integerSchema
            }
        },
        defaultProps: {
            color: '#000',
            backgroundOpacity: 0.35,
            fixed: false
        },
        allowedChildren: ['Loader', 'Text', 'Group', 'Stack']
    },
    {
        type: 'Portal',
        displayName: 'Portal',
        category: 'Overlay',
        description: 'Render children in a portal while keeping them in Builder JSON.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                target: stringSchema,
                reuseTargetNode: booleanSchema
            }
        },
        defaultChildren: [
            {
                id: 'portal-content',
                type: 'Text',
                props: {
                    children: 'Portal content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'OptionalPortal',
        displayName: 'Optional Portal',
        category: 'Overlay',
        description: 'Conditionally render children in a portal.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                withinPortal: booleanSchema,
                target: stringSchema,
                reuseTargetNode: booleanSchema
            }
        },
        defaultProps: {
            withinPortal: true
        },
        defaultChildren: [
            {
                id: 'optional-portal-content',
                type: 'Text',
                props: {
                    children: 'Optional portal content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'Transition',
        displayName: 'Transition',
        category: 'Overlay',
        description: 'Animate mounting and unmounting of a visual region.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                mounted: booleanSchema,
                transition: { type: 'string', enum: ['fade', 'scale', 'scale-y', 'scale-x', 'skew-up', 'skew-down', 'rotate-left', 'rotate-right', 'slide-down', 'slide-up', 'slide-left', 'slide-right', 'pop', 'pop-bottom-left', 'pop-bottom-right', 'pop-top-left', 'pop-top-right'] },
                duration: integerSchema,
                timingFunction: stringSchema
            }
        },
        defaultProps: {
            mounted: true,
            transition: 'fade',
            duration: 150
        },
        defaultChildren: [
            {
                id: 'transition-content',
                type: 'Text',
                props: {
                    children: 'Animated content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'FocusTrap',
        displayName: 'Focus Trap',
        category: 'Overlay',
        description: 'Trap keyboard focus within nested interactive content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                active: booleanSchema
            }
        },
        defaultProps: {
            active: true
        },
        defaultChildren: [
            {
                id: 'focus-trap-button',
                type: 'Button',
                props: {
                    children: 'Focusable action'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'FocusTrapInitialFocus',
        displayName: 'Focus Trap Initial Focus',
        category: 'Overlay',
        description: 'Initial focus marker for a FocusTrap region.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {}
        },
        allowedChildren: []
    },
    {
        type: 'FloatingArrow',
        displayName: 'Floating Arrow',
        category: 'Overlay',
        description: 'Arrow element for custom floating panels.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                position: { type: 'string', enum: ['top', 'right', 'bottom', 'left'] },
                arrowSize: integerSchema,
                arrowRadius: integerSchema,
                arrowOffset: integerSchema
            }
        },
        defaultProps: {
            position: 'bottom',
            arrowSize: 8
        },
        allowedChildren: []
    },
    {
        type: 'FloatingIndicator',
        displayName: 'Floating Indicator',
        category: 'Overlay',
        description: 'Animated indicator surface for custom segmented or tab-like controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                transitionDuration: integerSchema
            }
        },
        defaultProps: {
            transitionDuration: 150
        },
        allowedChildren: ['Box', 'Text']
    },
    {
        type: 'NativeScrollArea',
        displayName: 'Native Scroll Area',
        category: 'Overlay',
        description: 'Native scrolling container exported by Mantine.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                h: { type: ['string', 'number'] },
                w: { type: ['string', 'number'] },
                offsetScrollbars: booleanSchema
            }
        },
        defaultProps: {
            h: 160
        },
        defaultChildren: [
            {
                id: 'native-scroll-area-text',
                type: 'Text',
                props: {
                    children: 'Scrollable content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
    },
    {
        type: 'RemoveScroll',
        displayName: 'Remove Scroll',
        category: 'Overlay',
        description: 'Scroll-lock wrapper for modal or drawer compositions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                enabled: booleanSchema,
                removeScrollBar: booleanSchema,
                allowPinchZoom: booleanSchema
            }
        },
        defaultProps: {
            enabled: true,
            removeScrollBar: false
        },
        defaultChildren: [
            {
                id: 'remove-scroll-content',
                type: 'Text',
                props: {
                    children: 'Scroll locked content'
                }
            }
        ],
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
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
        type: 'Notification',
        displayName: 'Notification',
        category: 'Feedback',
        description: 'Mantine notification-style message block.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: stringSchema,
                message: stringSchema,
                color: colorSchema,
                icon: stringSchema,
                withCloseButton: booleanSchema,
                loading: booleanSchema,
                radius: sizeSchema
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
        type: 'LoadingOverlay',
        displayName: 'Loading Overlay',
        category: 'Feedback',
        description: 'Overlay indicating that enclosed or surrounding content is loading.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                visible: booleanSchema,
                loaderProps: objectSchema,
                overlayProps: objectSchema,
                zIndex: integerSchema
            }
        },
        defaultProps: {
            visible: true,
            zIndex: 100
        },
        allowedChildren: []
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
    },
    {
        type: 'Progress',
        displayName: 'Progress',
        category: 'Feedback',
        description: 'Linear progress indicator.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: numberSchema,
                color: colorSchema,
                radius: sizeSchema,
                size: sizeSchema,
                striped: booleanSchema,
                animated: booleanSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            value: 60,
            color: 'blue',
            radius: 'sm',
            size: 'md'
        },
        allowedChildren: []
    },
    {
        type: 'ProgressRoot',
        displayName: 'Progress Root',
        category: 'Feedback',
        description: 'Container for segmented Mantine progress sections.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: sizeSchema,
                radius: sizeSchema,
                transitionDuration: integerSchema
            }
        },
        defaultChildren: [
            {
                id: 'progress-root-section',
                type: 'ProgressSection',
                props: {
                    value: 60,
                    color: 'blue'
                },
                children: [
                    {
                        id: 'progress-root-label',
                        type: 'ProgressLabel',
                        props: {
                            children: '60%'
                        }
                    }
                ]
            }
        ],
        allowedChildren: ['ProgressSection']
    },
    {
        type: 'ProgressSection',
        displayName: 'Progress Section',
        category: 'Feedback',
        description: 'Segment inside a Mantine segmented Progress root.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: numberSchema,
                color: colorSchema,
                striped: booleanSchema,
                animated: booleanSchema
            }
        },
        defaultProps: {
            value: 60,
            color: 'blue'
        },
        allowedChildren: ['ProgressLabel']
    },
    {
        type: 'ProgressLabel',
        displayName: 'Progress Label',
        category: 'Feedback',
        description: 'Label inside a Mantine Progress section.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema
            }
        },
        defaultProps: {
            children: '60%'
        },
        allowedChildren: [...Builder_TEXT_INLINE_CHILDREN]
    },
    {
        type: 'RingProgress',
        displayName: 'Ring Progress',
        category: 'Feedback',
        description: 'Circular progress indicator.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: numberSchema,
                color: colorSchema,
                size: integerSchema,
                thickness: integerSchema,
                roundCaps: booleanSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            value: 72,
            color: 'blue',
            size: 120,
            thickness: 12,
            roundCaps: true
        },
        allowedChildren: []
    },
    {
        type: 'SemiCircleProgress',
        displayName: 'Semi Circle Progress',
        category: 'Feedback',
        description: 'Semi-circular progress indicator.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                value: numberSchema,
                color: colorSchema,
                size: integerSchema,
                thickness: integerSchema,
                label: stringSchema,
                orientation: { type: 'string', enum: ['up', 'down'] },
                fillDirection: { type: 'string', enum: ['left-to-right', 'right-to-left'] }
            }
        },
        defaultProps: {
            value: 64,
            color: 'blue',
            size: 160,
            thickness: 12,
            orientation: 'up',
            fillDirection: 'left-to-right'
        },
        allowedChildren: []
    },
    {
        type: 'Skeleton',
        displayName: 'Skeleton',
        category: 'Feedback',
        description: 'Placeholder block for loading content.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                visible: booleanSchema,
                animate: booleanSchema,
                radius: sizeSchema,
                width: { type: ['string', 'number'] },
                height: { type: ['string', 'number'] }
            }
        },
        defaultProps: {
            visible: true,
            animate: true,
            radius: 'sm',
            height: 40
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
        type: 'BackgroundImage',
        displayName: 'Background Image',
        category: 'Media',
        description: 'Image-backed content region with children over the background.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                src: stringSchema,
                radius: sizeSchema,
                padding: spacingSchema,
                minHeight: { type: ['string', 'number'] }
            }
        },
        defaultProps: {
            src: '',
            radius: 'sm',
            padding: 'lg',
            minHeight: 220
        },
        uiSchema: {
            src: {
                'ui:widget': 'uri',
                'ui:placeholder': 'https://example.com/background.jpg'
            },
            radius: {
                'ui:widget': 'select'
            },
            padding: {
                'ui:widget': 'select'
            }
        },
        allowedChildren: Builder_LAYOUT_CHILDREN.filter(type => type !== 'Page')
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
        type: 'AvatarGroup',
        displayName: 'Avatar Group',
        category: 'Media',
        description: 'Grouped avatars for people or entities.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                spacing: spacingSchema
            }
        },
        defaultChildren: [
            {
                id: 'avatar-group-item',
                type: 'Avatar',
                props: {
                    name: 'User'
                }
            }
        ],
        allowedChildren: ['Avatar']
    },
    {
        type: 'ThemeIcon',
        displayName: 'Theme Icon',
        category: 'Media',
        description: 'Mantine theme-colored icon container.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                children: stringSchema,
                label: stringSchema,
                color: colorSchema,
                variant: { type: 'string', enum: ['filled', 'light', 'outline', 'transparent', 'white', 'default'] },
                size: { type: ['string', 'number'] },
                radius: sizeSchema
            }
        },
        defaultProps: {
            children: '*',
            label: 'Icon',
            color: 'blue',
            variant: 'light',
            size: 'md'
        },
        allowedChildren: ['Icon', 'Text']
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
    },
    {
        type: 'CheckIcon',
        displayName: 'Check Icon',
        category: 'Media',
        description: 'Mantine check icon used by checkbox, chip, and status affordances.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: { type: ['string', 'number'] },
                color: colorSchema,
                strokeWidth: numberSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            size: 20,
            label: 'Check'
        },
        allowedChildren: []
    },
    {
        type: 'CloseIcon',
        displayName: 'Close Icon',
        category: 'Media',
        description: 'Mantine close icon used by dismiss and clear actions.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: { type: ['string', 'number'] },
                color: colorSchema,
                strokeWidth: numberSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            size: 20,
            label: 'Close'
        },
        allowedChildren: []
    },
    {
        type: 'RadioIcon',
        displayName: 'Radio Icon',
        category: 'Media',
        description: 'Mantine radio icon for selected single-choice states.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: { type: ['string', 'number'] },
                color: colorSchema,
                strokeWidth: numberSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            size: 20,
            label: 'Radio'
        },
        allowedChildren: []
    },
    {
        type: 'AccordionChevron',
        displayName: 'Accordion Chevron',
        category: 'Media',
        description: 'Mantine accordion chevron icon for expandable controls.',
        propsSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                size: { type: ['string', 'number'] },
                color: colorSchema,
                strokeWidth: numberSchema,
                label: stringSchema
            }
        },
        defaultProps: {
            size: 20,
            label: 'Accordion chevron'
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

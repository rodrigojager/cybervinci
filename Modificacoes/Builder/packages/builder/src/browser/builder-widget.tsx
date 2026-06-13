import {
    applyBuilderAiPatch,
    previewBuilderAiPatch,
    type BuilderAiPatch,
    type BuilderAiStructuralDiffEntry,
    type PreviewBuilderAiPatchResult
} from '@cybervinci/builder-ai';
import {
    createDefaultBuilderActionRegistry,
    createDefaultBuilderComponentRegistry,
    createDefaultBuilderDataSourceRegistry,
    Builder_COMPONENT_CATEGORIES,
    validateBuilderDocumentActionsAgainstRegistry,
    validateBuilderDocumentDataSourcesAgainstRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    type BuilderActionRegistryValidationError,
    type BuilderComponentCategory,
    type BuilderComponentDefinition,
    type BuilderDataSourceRegistryValidationError,
    type BuilderValidationError
} from '@cybervinci/builder-registry';
import { BuilderPropertyPanel, createPropertyPanelModel, type BuilderRjsfFormProps } from '@cybervinci/builder-property-panel-rjsf';
import {
    findNodeById,
    insertNode,
    moveNode,
    serializeBuilderDocumentJson,
    Builder_DEFAULT_THEME,
    validateBuilderDocumentStructure,
    type BuilderDocument,
    type BuilderJsonValue,
    type BuilderNode,
    type BuilderNodePathSegment,
    type BuilderStyle,
    type BuilderTheme
} from '@cybervinci/builder-schema';
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
    renderBuilderDocument,
    type BuilderMantineComponentResolver,
    type BuilderMantineComponentType,
    type BuilderMantineProviderComponent
} from '@cybervinci/builder-renderer-mantine';
import * as Mantine from '@mantine/core';
import Form from '@rjsf/core';
import rjsfValidator from '@rjsf/validator-ajv8';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import { MessageService, Emitter, Event } from '@theia/core/lib/common';
import { CommandService } from '@theia/core/lib/common/command';
import { Navigatable, OpenerService, ReactWidget, Saveable, SaveableSource, codicon, Message, open } from '@theia/core/lib/browser';
import { FileDialogService } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import * as monaco from '@theia/monaco-editor-core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { BuilderCommands, BuilderService } from '../common';
import { PageBuilderApp } from './components/PageBuilderApp';
import type { PageBuilderViewMode } from './components/BuilderToolbar';
import type { ComponentLibraryTab } from './components/ComponentLibraryPanel';
import type { BuilderPreviewViewport } from './components/PreviewPanel';
import type { BuilderPropertiesTab } from './components/PropertiesPanel';
import { BuilderEditorState, formatValidationMessage } from './builder-editor-state';
import {
    createBuilderCopyUri,
    createBuilderTextDiffSummary,
    BuilderSaveConflictError,
    persistBuilderJsonFile,
    toBuilderFileVersion,
    type BuilderFileVersion
} from './builder-file-persistence';

export const BuilderWidgetOptions = Symbol('BuilderWidgetOptions');

export interface BuilderWidgetOptions {
    uri: string;
}

const Builder_COMPONENT_DRAG_MIME = 'application/x-builder-component-type';
const Builder_NODE_DRAG_MIME = 'application/x-builder-node-id';

const Builder_COMPONENT_CATEGORY_ICONS: Record<BuilderComponentCategory, string> = {
    Layout: 'layout',
    Typography: 'symbol-string',
    Form: 'checklist',
    Navigation: 'compass',
    Feedback: 'bell',
    'Data Display': 'graph',
    Overlay: 'multiple-windows',
    Media: 'device-camera',
    Marketing: 'megaphone',
    Dashboard: 'dashboard',
    Custom: 'symbol-misc'
};

const Builder_COMPONENT_TYPE_ICONS: Record<string, string> = {
    Page: 'file',
    Section: 'split-horizontal',
    Container: 'screen-normal',
    Stack: 'list-tree',
    Group: 'group-by-ref-type',
    SimpleGrid: 'layout',
    Grid: 'layout',
    GridCol: 'layout-panel',
    Card: 'symbol-struct',
    CardSection: 'layout-panel',
    Paper: 'layout-panel',
    Center: 'circle-large-filled',
    Flex: 'layout-activitybar-left',
    AspectRatio: 'device-camera-video',
    Affix: 'pinned',
    AppShell: 'window',
    AppShellHeader: 'layout-panel-top',
    AppShellNavbar: 'layout-sidebar-left',
    AppShellAside: 'layout-sidebar-right',
    AppShellMain: 'layout-centered',
    AppShellFooter: 'layout-panel-bottom',
    AppShellSection: 'layout-panel',
    Collapse: 'fold',
    Indicator: 'circle-filled',
    ScrollArea: 'list-tree',
    Spoiler: 'fold',
    ScrollAreaAutosize: 'list-tree',
    TableScrollContainer: 'table',
    VisuallyHidden: 'eye-closed',
    Divider: 'dash',
    Space: 'blank',
    Box: 'symbol-misc',
    Title: 'text-size',
    Text: 'symbol-string',
    Badge: 'tag',
    Code: 'code',
    Kbd: 'keyboard',
    Mark: 'symbol-keyword',
    Pill: 'tag',
    PillGroup: 'tag',
    TypographyStylesProvider: 'symbol-string',
    NumberFormatter: 'symbol-number',
    Blockquote: 'quote',
    Highlight: 'sparkle',
    List: 'list-ordered',
    ListItem: 'list-selection',
    Markdown: 'markdown',
    Button: 'symbol-method',
    ButtonGroup: 'group-by-ref-type',
    ButtonGroupSection: 'layout-panel',
    ActionIcon: 'tools',
    ActionIconGroup: 'tools',
    ActionIconGroupSection: 'layout-panel',
    UnstyledButton: 'circle-large-outline',
    Burger: 'menu',
    CloseButton: 'close',
    CopyButton: 'copy',
    Input: 'edit',
    InputBase: 'edit',
    InputWrapper: 'layout-panel',
    InputLabel: 'symbol-string',
    InputDescription: 'note',
    InputPlaceholder: 'placeholder',
    InputClearButton: 'clear-all',
    InputError: 'error',
    TextInput: 'edit',
    Autocomplete: 'sparkle',
    PasswordInput: 'lock',
    Textarea: 'note',
    Select: 'list-selection',
    MultiSelect: 'checklist',
    NativeSelect: 'list-flat',
    Combobox: 'list-selection',
    ComboboxTarget: 'symbol-method',
    ComboboxDropdownTarget: 'edit',
    ComboboxEventsTarget: 'symbol-event',
    ComboboxDropdown: 'layout-panel',
    ComboboxOptions: 'list-flat',
    ComboboxOption: 'list-selection',
    ComboboxSearch: 'search',
    ComboboxEmpty: 'circle-slash',
    ComboboxGroup: 'group-by-ref-type',
    ComboboxHeader: 'layout-panel-top',
    ComboboxFooter: 'layout-panel-bottom',
    ComboboxChevron: 'chevron-down',
    ComboboxClearButton: 'clear-all',
    ComboboxHiddenInput: 'eye-closed',
    Checkbox: 'check',
    CheckboxGroup: 'checklist',
    CheckboxCard: 'checklist',
    CheckboxIndicator: 'check',
    Switch: 'toggle',
    SwitchGroup: 'toggle',
    RadioGroup: 'circle-large-outline',
    Radio: 'circle-large-outline',
    RadioCard: 'circle-large-outline',
    RadioIndicator: 'circle-large-filled',
    NumberInput: 'symbol-number',
    DateInput: 'calendar',
    Chip: 'tag',
    ChipGroup: 'tag',
    Slider: 'settings',
    RangeSlider: 'settings-gear',
    SegmentedControl: 'layout-centered',
    PinInput: 'symbol-number',
    ColorInput: 'symbol-color',
    ColorPicker: 'color-mode',
    HueSlider: 'symbol-color',
    AlphaSlider: 'symbol-color',
    AngleSlider: 'settings',
    ColorSwatch: 'symbol-color',
    JsonInput: 'json',
    TagsInput: 'tag',
    FileInput: 'file',
    FileButton: 'file',
    Fieldset: 'group-by-ref-type',
    PillsInput: 'tag',
    PillsInputField: 'edit',
    Rating: 'star-full',
    DynamicForm: 'checklist',
    Table: 'table',
    TableCaption: 'comment',
    TableThead: 'table',
    TableTbody: 'table',
    TableTfoot: 'table',
    TableTr: 'arrow-right',
    TableTh: 'symbol-key',
    TableTd: 'symbol-field',
    DataTable: 'table',
    Accordion: 'list-tree',
    AccordionItem: 'list-tree',
    AccordionControl: 'chevron-right',
    AccordionPanel: 'layout-panel',
    Timeline: 'timeline',
    TimelineItem: 'timeline',
    Tree: 'list-tree',
    MetricCard: 'pulse',
    StatCard: 'graph-line',
    Anchor: 'link',
    NavLink: 'arrow-right',
    Breadcrumbs: 'ellipsis',
    Menu: 'menu',
    MenuTarget: 'symbol-method',
    MenuDropdown: 'layout-panel',
    MenuItem: 'list-selection',
    MenuLabel: 'symbol-string',
    MenuDivider: 'dash',
    Tabs: 'layout-sidebar-left',
    TabsList: 'list-flat',
    TabsTab: 'chrome-restore',
    TabsPanel: 'layout-panel',
    Stepper: 'debug-step-over',
    StepperStep: 'debug-step-over',
    StepperCompleted: 'pass',
    Pagination: 'list-ordered',
    PaginationRoot: 'list-ordered',
    PaginationControl: 'symbol-number',
    PaginationDots: 'ellipsis',
    PaginationFirst: 'debug-step-back',
    PaginationItems: 'list-selection',
    PaginationLast: 'debug-step-over',
    PaginationNext: 'arrow-right',
    PaginationPrevious: 'arrow-left',
    TableOfContents: 'list-ordered',
    Modal: 'multiple-windows',
    ModalRoot: 'multiple-windows',
    ModalOverlay: 'screen-full',
    ModalContent: 'layout-panel',
    ModalHeader: 'layout-panel-top',
    ModalTitle: 'text-size',
    ModalCloseButton: 'close',
    ModalBody: 'layout-panel',
    ModalStack: 'multiple-windows',
    ModalBase: 'multiple-windows',
    ModalBaseOverlay: 'screen-full',
    ModalBaseContent: 'layout-panel',
    ModalBaseHeader: 'layout-panel-top',
    ModalBaseTitle: 'text-size',
    ModalBaseCloseButton: 'close',
    ModalBaseBody: 'layout-panel',
    Drawer: 'layout-sidebar-right',
    DrawerRoot: 'layout-sidebar-right',
    DrawerOverlay: 'screen-full',
    DrawerContent: 'layout-panel',
    DrawerHeader: 'layout-panel-top',
    DrawerTitle: 'text-size',
    DrawerCloseButton: 'close',
    DrawerBody: 'layout-panel',
    DrawerStack: 'layout-sidebar-right',
    Tooltip: 'question',
    TooltipFloating: 'question',
    TooltipGroup: 'group-by-ref-type',
    Popover: 'window',
    PopoverTarget: 'symbol-method',
    PopoverDropdown: 'layout-panel',
    HoverCard: 'window',
    HoverCardTarget: 'symbol-method',
    HoverCardDropdown: 'layout-panel',
    Dialog: 'comment',
    Overlay: 'screen-full',
    Portal: 'go-to-file',
    OptionalPortal: 'go-to-file',
    Transition: 'debug-step-over',
    FocusTrap: 'target',
    FocusTrapInitialFocus: 'circle-filled',
    FloatingArrow: 'arrow-down',
    FloatingIndicator: 'dash',
    NativeScrollArea: 'list-tree',
    RemoveScroll: 'lock',
    Alert: 'warning',
    Notification: 'bell',
    NotificationBlock: 'bell',
    LoadingOverlay: 'loading',
    Loader: 'loading',
    Progress: 'pulse',
    ProgressRoot: 'pulse',
    ProgressSection: 'graph-line',
    ProgressLabel: 'symbol-string',
    RingProgress: 'circle-large-filled',
    SemiCircleProgress: 'pulse',
    Skeleton: 'loading',
    Image: 'file-media',
    BackgroundImage: 'file-media',
    Avatar: 'account',
    AvatarGroup: 'accounts-view-bar-icon',
    ThemeIcon: 'symbol-color',
    Icon: 'symbol-event',
    CheckIcon: 'check',
    CloseIcon: 'close',
    RadioIcon: 'circle-large-filled',
    AccordionChevron: 'chevron-right',
    HeroSection: 'rocket',
    FeatureGrid: 'symbol-array',
    PricingSection: 'credit-card',
    TestimonialSection: 'quote',
    CTASection: 'megaphone',
    ChartPlaceholder: 'graph',
    MetricGrid: 'dashboard',
    DashboardHeader: 'window'
};

type BuilderPanel = 'components' | 'blocks' | 'insert' | 'layers' | 'properties' | 'theme' | 'data' | 'ai' | 'export' | 'json';
type BuilderPanelGroupId = 'build' | 'inspect' | 'tools';
type BuilderLayerPanelMode = 'tree' | 'quickInsert';
const Builder_LIBRARY_PANELS = new Set<BuilderPanel>(['components', 'blocks', 'insert', 'layers']);
const Builder_LIBRARY_TABS = new Set<BuilderPanel>(['components', 'blocks', 'insert']);

interface BuilderPanelDefinition {
    id: BuilderPanel;
    title: string;
    icon: string;
    ariaLabel?: string;
}

interface BuilderPanelGroup {
    id: BuilderPanelGroupId;
    title: string;
    icon: string;
    panels: BuilderPanel[];
}

interface BuilderStyleField {
    property: string;
    label: string;
    kind?: 'color' | 'size' | 'text';
}

interface BuilderStylePreset {
    id: string;
    title: string;
    icon: string;
    css: Record<string, string>;
}

const BUILDER_PANELS: BuilderPanelDefinition[] = [
    { id: 'components', title: 'Components', icon: 'symbol-misc', ariaLabel: 'Componentes' },
    { id: 'blocks', title: 'Blocks', icon: 'layout', ariaLabel: 'Blocos prontos' },
    { id: 'insert', title: 'Insert', icon: 'add', ariaLabel: 'Inserir componentes' },
    { id: 'layers', title: 'Layers', icon: 'list-tree' },
    { id: 'properties', title: 'Properties', icon: 'settings-gear', ariaLabel: 'Propriedades' },
    { id: 'theme', title: 'Theme', icon: 'color-mode', ariaLabel: 'Tema global' },
    { id: 'data', title: 'Data', icon: 'database', ariaLabel: 'Dados e ações' },
    { id: 'ai', title: 'AI', icon: 'sparkle', ariaLabel: 'IA' },
    { id: 'export', title: 'Export', icon: 'export', ariaLabel: 'Exportar' },
    { id: 'json', title: 'JSON', icon: 'json', ariaLabel: 'Documento JSON' }
];

const BUILDER_PANEL_GROUPS: BuilderPanelGroup[] = [
    {
        id: 'build',
        title: 'Build',
        icon: 'tools',
        panels: ['components', 'blocks', 'insert', 'layers']
    },
    {
        id: 'inspect',
        title: 'Inspect',
        icon: 'eye',
        panels: ['properties', 'theme', 'json']
    },
    {
        id: 'tools',
        title: 'Tools',
        icon: 'cog',
        panels: ['data', 'ai', 'export']
    }
];

const BUILDER_WORKFLOW_PANELS: BuilderPanel[] = ['components', 'blocks', 'insert', 'layers', 'properties', 'theme'];

const Builder_LAYER_QUICK_INSERT_TYPES = ['Text', 'Button', 'Card', 'Container', 'Image', 'Section', 'Title', 'Alert', 'MetricCard'];

interface BuilderBlockTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    nodes: BuilderNode[];
}

const BUILDER_BLOCK_TEMPLATES: BuilderBlockTemplate[] = [
    {
        id: 'hero-with-actions',
        title: 'Hero with Actions',
        description: 'Marketing hero with title, copy and primary action slot.',
        category: 'Marketing',
        icon: 'rocket',
        nodes: [{
            id: 'block-hero',
            type: 'HeroSection',
            props: {
                eyebrow: 'Launch ready',
                title: 'A polished page built from Builder components',
                subtitle: 'Use canonical Builder nodes for structure, Mantine for the preview, and RJSF for structured editing.',
                align: 'left'
            },
            slots: {
                actions: [
                    {
                        id: 'block-hero-primary',
                        type: 'Button',
                        props: {
                            children: 'Primary action',
                            variant: 'filled',
                            size: 'lg'
                        }
                    },
                    {
                        id: 'block-hero-secondary',
                        type: 'Button',
                        props: {
                            children: 'Secondary',
                            variant: 'outline',
                            size: 'lg'
                        }
                    }
                ]
            }
        }]
    },
    {
        id: 'feature-grid',
        title: 'Feature Grid',
        description: 'Three-column feature section for product benefits.',
        category: 'Marketing',
        icon: 'symbol-array',
        nodes: [{
            id: 'block-features-section',
            type: 'Section',
            props: {
                paddingY: 'xl',
                background: '#f8fafc'
            },
            children: [{
                id: 'block-features',
                type: 'FeatureGrid',
                props: {
                    title: 'Designed as adapters, not lock-in',
                    description: 'Every tool can render or edit the same Builder Schema without changing the saved contract.',
                    columns: 3,
                    features: [
                        {
                            title: 'Mantine preview',
                            description: 'Render with real Mantine components while keeping Builder as the source.'
                        },
                        {
                            title: 'RJSF inspector',
                            description: 'Generate safe forms from component prop schemas.'
                        },
                        {
                            title: 'Structured output',
                            description: 'Exporters and AI patches consume the same canonical tree.'
                        }
                    ]
                }
            }]
        }]
    },
    {
        id: 'metrics-row',
        title: 'Metrics Row',
        description: 'Dashboard-style cards for KPIs and summaries.',
        category: 'Dashboard',
        icon: 'dashboard',
        nodes: [{
            id: 'block-metrics',
            type: 'MetricGrid',
            props: {
                columns: 3,
                spacing: 'md'
            },
            children: [
                {
                    id: 'block-metric-one',
                    type: 'MetricCard',
                    props: {
                        label: 'Conversion',
                        value: '18.4%',
                        description: 'Qualified sessions this week',
                        trend: 'up',
                        trendLabel: '+3.2%',
                        color: 'green'
                    }
                },
                {
                    id: 'block-metric-two',
                    type: 'MetricCard',
                    props: {
                        label: 'Revenue',
                        value: '$42.8k',
                        description: 'Projected monthly recurring revenue',
                        trend: 'up',
                        trendLabel: '+8.1%',
                        color: 'blue'
                    }
                },
                {
                    id: 'block-metric-three',
                    type: 'MetricCard',
                    props: {
                        label: 'Risk',
                        value: 'Low',
                        description: 'No critical validation issues',
                        trend: 'neutral',
                        trendLabel: 'stable',
                        color: 'gray'
                    }
                }
            ]
        }]
    },
    {
        id: 'cta-band',
        title: 'CTA Band',
        description: 'Focused call-to-action section with button slot.',
        category: 'Marketing',
        icon: 'megaphone',
        nodes: [{
            id: 'block-cta',
            type: 'CTASection',
            props: {
                title: 'Move from draft to validated page',
                description: 'Edit visually, validate the schema, and export when the page is ready.',
                align: 'center'
            },
            slots: {
                actions: [{
                    id: 'block-cta-primary',
                    type: 'Button',
                    props: {
                        children: 'Validate page',
                        variant: 'filled'
                    }
                }]
            }
        }]
    }
];

const Builder_THEME_COLOR_SWATCHES = ['blue', 'cyan', 'green', 'teal', 'violet', 'grape', 'red', 'orange', '#2563eb', '#0f766e', '#7c3aed', '#dc2626'];

const Builder_STYLE_COLOR_SWATCHES = ['#ffffff', '#f8fafc', '#eef2ff', '#ecfeff', '#f0fdf4', '#111827', '#1f2937', '#2563eb', '#0f766e', '#7c3aed', '#dc2626'];
const Builder_THEME_PRESET_TOKENS: Array<{ token: string; label: string; value: string }> = [
    { token: 'surface', label: 'Surface', value: '#ffffff' },
    { token: 'surfaceMuted', label: 'Surface Muted', value: '#f8fafc' },
    { token: 'heroSurface', label: 'Hero Surface', value: '#ecfeff' },
    { token: 'textPrimary', label: 'Text Primary', value: '#0f172a' },
    { token: 'textMuted', label: 'Text Muted', value: '#64748b' },
    { token: 'brandAccent', label: 'Accent', value: '#0ea5e9' }
];

const Builder_THEME_PRESETS: Array<{ id: string; title: string; icon: string; patch: Partial<BuilderTheme> }> = [
    {
        id: 'studio-light',
        title: 'Studio Light',
        icon: 'color-mode',
        patch: {
            mode: 'light',
            primaryColor: 'blue',
            radius: 'md',
            tokens: {
                surface: '#ffffff',
                surfaceMuted: '#f8fafc',
                heroSurface: '#eff6ff',
                textPrimary: '#0f172a',
                textMuted: '#64748b',
                brandAccent: '#2563eb'
            }
        }
    },
    {
        id: 'product-teal',
        title: 'Product Teal',
        icon: 'symbol-color',
        patch: {
            mode: 'light',
            primaryColor: 'teal',
            radius: 'lg',
            tokens: {
                surface: '#ffffff',
                surfaceMuted: '#f0fdfa',
                heroSurface: '#ccfbf1',
                textPrimary: '#0f172a',
                textMuted: '#475569',
                brandAccent: '#0f766e'
            }
        }
    },
    {
        id: 'executive-slate',
        title: 'Executive Slate',
        icon: 'dashboard',
        patch: {
            mode: 'light',
            primaryColor: 'indigo',
            radius: 'sm',
            tokens: {
                surface: '#ffffff',
                surfaceMuted: '#f1f5f9',
                heroSurface: '#eef2ff',
                textPrimary: '#111827',
                textMuted: '#4b5563',
                brandAccent: '#4f46e5'
            }
        }
    }
];

const Builder_STYLE_PRESET_PROPERTIES: BuilderStyleField[] = [
    { property: 'border', label: 'Border', kind: 'text' },
    { property: 'boxShadow', label: 'Box shadow', kind: 'text' },
    { property: 'width', label: 'Largura', kind: 'size' },
    { property: 'height', label: 'Altura', kind: 'size' },
    { property: 'maxWidth', label: 'Max width', kind: 'size' },
    { property: 'backgroundColor', label: 'Background color', kind: 'color' },
    { property: 'borderColor', label: 'Border color', kind: 'color' },
    { property: 'outline', label: 'Outline', kind: 'text' },
    { property: 'cursor', label: 'Cursor', kind: 'text' }
];

const Builder_STYLE_FIELDS: BuilderStyleField[] = [
    { property: 'color', label: 'Text color', kind: 'color' },
    { property: 'background', label: 'Background', kind: 'color' },
    { property: 'border', label: 'Border' },
    { property: 'borderRadius', label: 'Radius', kind: 'size' },
    { property: 'boxShadow', label: 'Box shadow' },
    { property: 'padding', label: 'Padding', kind: 'size' },
    { property: 'margin', label: 'Margin', kind: 'size' },
    { property: 'gap', label: 'Gap', kind: 'size' },
    { property: 'display', label: 'Display' },
    { property: 'position', label: 'Position' },
    { property: 'top', label: 'Top', kind: 'size' },
    { property: 'left', label: 'Left', kind: 'size' },
    { property: 'right', label: 'Right', kind: 'size' },
    { property: 'bottom', label: 'Bottom', kind: 'size' },
    { property: 'zIndex', label: 'Z Index', kind: 'size' },
    { property: 'alignItems', label: 'Align items' },
    { property: 'justifyContent', label: 'Justify content' },
    { property: 'flex', label: 'Flex', kind: 'size' },
    { property: 'opacity', label: 'Opacity', kind: 'size' },
    { property: 'fontSize', label: 'Font size', kind: 'size' },
    { property: 'fontWeight', label: 'Font weight', kind: 'text' },
    { property: 'lineHeight', label: 'Line height', kind: 'size' },
    { property: 'overflow', label: 'Overflow' },
    { property: 'width', label: 'Width', kind: 'size' },
    { property: 'minHeight', label: 'Min height', kind: 'size' },
    { property: 'textAlign', label: 'Text align', kind: 'text' }
];

const Builder_STYLE_FIELD_DEFINITIONS = new Map(
    [...Builder_STYLE_FIELDS, ...Builder_STYLE_PRESET_PROPERTIES]
        .map(field => [field.property, field] as const)
);

const Builder_STYLE_COLOR_FIELDS = new Set(
    [...Builder_STYLE_FIELD_DEFINITIONS.values()]
        .filter(field => field.kind === 'color' || isColorLikeProperty(field.property, field.label))
        .map(field => field.property)
);

const Builder_STYLE_PRESETS: BuilderStylePreset[] = [
    {
        id: 'surface-card',
        title: 'Surface card',
        icon: 'symbol-struct',
        css: {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
            padding: '24px'
        }
    },
    {
        id: 'accent-panel',
        title: 'Accent panel',
        icon: 'symbol-color',
        css: {
            background: '#ecfeff',
            border: '1px solid #a5f3fc',
            borderRadius: '16px',
            padding: '32px'
        }
    },
    {
        id: 'hero-band',
        title: 'Hero band',
        icon: 'rocket',
        css: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 48%, #ecfeff 100%)',
            minHeight: '520px',
            padding: '56px 32px'
        }
    },
    {
        id: 'muted-copy',
        title: 'Muted copy',
        icon: 'text-size',
        css: {
            color: '#64748b',
            fontSize: '16px',
            lineHeight: '1.65'
        }
    }
];

const Builder_THEME_TOKEN_COLOR_HINTS = [
    'surface',
    'surfaceMuted',
    'heroSurface',
    'textPrimary',
    'textMuted',
    'brandAccent',
    'brandSecondary'
];

const Builder_PRESET_STYLE_GROUPS: Array<{ id: string; title: string; fields: string[] }> = [
    { id: 'core', title: 'Propriedades principais', fields: ['color', 'background', 'backgroundColor', 'border', 'borderColor'] },
    { id: 'layout', title: 'Layout', fields: ['display', 'position', 'top', 'right', 'left', 'bottom', 'width', 'height', 'minHeight', 'maxWidth', 'padding', 'margin', 'gap', 'flex', 'zIndex'] },
    { id: 'visual', title: 'Visual', fields: ['borderRadius', 'boxShadow', 'fontSize', 'lineHeight', 'fontWeight', 'opacity', 'textAlign', 'alignItems', 'justifyContent', 'overflow', 'cursor', 'outline'] }
];

const Builder_STYLE_FIELD_GROUPS: Array<{ id: string; title: string; fields: string[] }> = [
    { id: 'typography', title: 'Typo', fields: ['color', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign'] },
    { id: 'layout', title: 'Layout', fields: ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'minHeight', 'overflow', 'alignItems', 'justifyContent'] },
    { id: 'spacing', title: 'Spacing', fields: ['padding', 'margin', 'gap', 'flex', 'zIndex'] },
    { id: 'decor', title: 'Decoration', fields: ['background', 'border', 'borderRadius', 'boxShadow', 'opacity'] }
];

function asBuilderMantineComponent(component: unknown): BuilderMantineComponentType {
    return component as BuilderMantineComponentType;
}

const Builder_MANTINE_PROVIDER = Mantine.MantineProvider as unknown as BuilderMantineProviderComponent;

const Builder_MANTINE_COMPONENTS: BuilderMantineComponentResolver = {
    ...createBuilderMantineLayoutComponents({
        Affix: asBuilderMantineComponent(Mantine.Affix),
        AppShell: asBuilderMantineComponent(Mantine.AppShell),
        AppShellAside: asBuilderMantineComponent(Mantine.AppShell.Aside),
        AppShellFooter: asBuilderMantineComponent(Mantine.AppShell.Footer),
        AppShellHeader: asBuilderMantineComponent(Mantine.AppShell.Header),
        AppShellMain: asBuilderMantineComponent(Mantine.AppShell.Main),
        AppShellNavbar: asBuilderMantineComponent(Mantine.AppShell.Navbar),
        AppShellSection: asBuilderMantineComponent(Mantine.AppShell.Section),
        AspectRatio: asBuilderMantineComponent(Mantine.AspectRatio),
        Box: asBuilderMantineComponent(Mantine.Box),
        Card: asBuilderMantineComponent(Mantine.Card),
        Center: asBuilderMantineComponent(Mantine.Center),
        Collapse: asBuilderMantineComponent(Mantine.Collapse),
        Container: asBuilderMantineComponent(Mantine.Container),
        Divider: asBuilderMantineComponent(Mantine.Divider),
        Flex: asBuilderMantineComponent(Mantine.Flex),
        Grid: asBuilderMantineComponent(Mantine.Grid),
        GridCol: asBuilderMantineComponent(Mantine.Grid.Col),
        Group: asBuilderMantineComponent(Mantine.Group),
        Indicator: asBuilderMantineComponent(Mantine.Indicator),
        Paper: asBuilderMantineComponent(Mantine.Paper),
        CardSection: asBuilderMantineComponent(Mantine.Card.Section),
        ScrollArea: asBuilderMantineComponent(Mantine.ScrollArea),
        ScrollAreaAutosize: asBuilderMantineComponent(Mantine.ScrollArea.Autosize),
        SimpleGrid: asBuilderMantineComponent(Mantine.SimpleGrid),
        Space: asBuilderMantineComponent(Mantine.Space),
        Spoiler: asBuilderMantineComponent(Mantine.Spoiler),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        TableScrollContainer: asBuilderMantineComponent(Mantine.Table.ScrollContainer),
        VisuallyHidden: asBuilderMantineComponent(Mantine.VisuallyHidden)
    }),
    ...createBuilderMantineTypographyComponents({
        Title: asBuilderMantineComponent(Mantine.Title),
        Text: asBuilderMantineComponent(Mantine.Text),
        Badge: asBuilderMantineComponent(Mantine.Badge),
        Blockquote: asBuilderMantineComponent(Mantine.Blockquote),
        Code: asBuilderMantineComponent(Mantine.Code),
        Highlight: asBuilderMantineComponent(Mantine.Highlight),
        Kbd: asBuilderMantineComponent(Mantine.Kbd),
        List: asBuilderMantineComponent(Mantine.List),
        ListItem: asBuilderMantineComponent(Mantine.List.Item),
        Mark: asBuilderMantineComponent(Mantine.Mark),
        NumberFormatter: asBuilderMantineComponent(Mantine.NumberFormatter),
        Pill: asBuilderMantineComponent(Mantine.Pill),
        PillGroup: asBuilderMantineComponent(Mantine.Pill.Group),
        TypographyStylesProvider: asBuilderMantineComponent(Mantine.TypographyStylesProvider)
    }),
    ...createBuilderMantineFormComponents({
        ActionIcon: asBuilderMantineComponent(Mantine.ActionIcon),
        ActionIconGroup: asBuilderMantineComponent(Mantine.ActionIcon.Group),
        ActionIconGroupSection: asBuilderMantineComponent(Mantine.ActionIcon.GroupSection),
        Autocomplete: asBuilderMantineComponent(Mantine.Autocomplete),
        Burger: asBuilderMantineComponent(Mantine.Burger),
        Button: asBuilderMantineComponent(Mantine.Button),
        ButtonGroup: asBuilderMantineComponent(Mantine.Button.Group),
        ButtonGroupSection: asBuilderMantineComponent(Mantine.Button.GroupSection),
        CheckboxCard: asBuilderMantineComponent(Mantine.Checkbox.Card),
        CheckboxIndicator: asBuilderMantineComponent(Mantine.Checkbox.Indicator),
        Chip: asBuilderMantineComponent(Mantine.Chip),
        CloseButton: asBuilderMantineComponent(Mantine.CloseButton),
        ColorInput: asBuilderMantineComponent(Mantine.ColorInput),
        ColorPicker: asBuilderMantineComponent(Mantine.ColorPicker),
        ColorSwatch: asBuilderMantineComponent(Mantine.ColorSwatch),
        CopyButton: asBuilderMantineComponent(Mantine.CopyButton),
        Input: asBuilderMantineComponent(Mantine.Input),
        InputBase: asBuilderMantineComponent(Mantine.InputBase),
        InputWrapper: asBuilderMantineComponent(Mantine.Input.Wrapper),
        InputLabel: asBuilderMantineComponent(Mantine.Input.Label),
        InputDescription: asBuilderMantineComponent(Mantine.Input.Description),
        InputPlaceholder: asBuilderMantineComponent(Mantine.Input.Placeholder),
        InputClearButton: asBuilderMantineComponent(Mantine.Input.ClearButton),
        InputError: asBuilderMantineComponent(Mantine.Input.Error),
        Fieldset: asBuilderMantineComponent(Mantine.Fieldset),
        FileButton: asBuilderMantineComponent(Mantine.FileButton),
        TextInput: asBuilderMantineComponent(Mantine.TextInput),
        PasswordInput: asBuilderMantineComponent(Mantine.PasswordInput),
        Textarea: asBuilderMantineComponent(Mantine.Textarea),
        Select: asBuilderMantineComponent(Mantine.Select),
        MultiSelect: asBuilderMantineComponent(Mantine.MultiSelect),
        NativeSelect: asBuilderMantineComponent(Mantine.NativeSelect),
        Combobox: asBuilderMantineComponent(Mantine.Combobox),
        ComboboxTarget: asBuilderMantineComponent(Mantine.Combobox.Target),
        ComboboxDropdownTarget: asBuilderMantineComponent(Mantine.Combobox.DropdownTarget),
        ComboboxEventsTarget: asBuilderMantineComponent(Mantine.Combobox.EventsTarget),
        ComboboxDropdown: asBuilderMantineComponent(Mantine.Combobox.Dropdown),
        ComboboxOptions: asBuilderMantineComponent(Mantine.Combobox.Options),
        ComboboxOption: asBuilderMantineComponent(Mantine.Combobox.Option),
        ComboboxSearch: asBuilderMantineComponent(Mantine.Combobox.Search),
        ComboboxEmpty: asBuilderMantineComponent(Mantine.Combobox.Empty),
        ComboboxGroup: asBuilderMantineComponent(Mantine.Combobox.Group),
        ComboboxHeader: asBuilderMantineComponent(Mantine.Combobox.Header),
        ComboboxFooter: asBuilderMantineComponent(Mantine.Combobox.Footer),
        ComboboxChevron: asBuilderMantineComponent(Mantine.Combobox.Chevron),
        ComboboxClearButton: asBuilderMantineComponent(Mantine.Combobox.ClearButton),
        ComboboxHiddenInput: asBuilderMantineComponent(Mantine.Combobox.HiddenInput),
        CheckboxGroup: asBuilderMantineComponent(Mantine.Checkbox.Group),
        Checkbox: asBuilderMantineComponent(Mantine.Checkbox),
        FileInput: asBuilderMantineComponent(Mantine.FileInput),
        JsonInput: asBuilderMantineComponent(Mantine.JsonInput),
        Pill: asBuilderMantineComponent(Mantine.Pill),
        PillGroup: asBuilderMantineComponent(Mantine.Pill.Group),
        PillsInput: asBuilderMantineComponent(Mantine.PillsInput),
        PillsInputField: asBuilderMantineComponent(Mantine.PillsInput.Field),
        PinInput: asBuilderMantineComponent(Mantine.PinInput),
        RadioCard: asBuilderMantineComponent(Mantine.Radio.Card),
        RadioGroup: asBuilderMantineComponent(Mantine.Radio.Group),
        Radio: asBuilderMantineComponent(Mantine.Radio),
        RadioIndicator: asBuilderMantineComponent(Mantine.Radio.Indicator),
        RangeSlider: asBuilderMantineComponent(Mantine.RangeSlider),
        HueSlider: asBuilderMantineComponent(Mantine.HueSlider),
        AlphaSlider: asBuilderMantineComponent(Mantine.AlphaSlider),
        AngleSlider: asBuilderMantineComponent(Mantine.AngleSlider),
        Rating: asBuilderMantineComponent(Mantine.Rating),
        SegmentedControl: asBuilderMantineComponent(Mantine.SegmentedControl),
        Slider: asBuilderMantineComponent(Mantine.Slider),
        SwitchGroup: asBuilderMantineComponent(Mantine.Switch.Group),
        Switch: asBuilderMantineComponent(Mantine.Switch),
        TagsInput: asBuilderMantineComponent(Mantine.TagsInput),
        ChipGroup: asBuilderMantineComponent(Mantine.Chip.Group),
        NumberInput: asBuilderMantineComponent(Mantine.NumberInput),
        UnstyledButton: asBuilderMantineComponent(Mantine.UnstyledButton),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        Group: asBuilderMantineComponent(Mantine.Group)
    }),
    ...createBuilderMantineDataDisplayComponents({
        Accordion: asBuilderMantineComponent(Mantine.Accordion),
        AccordionItem: asBuilderMantineComponent(Mantine.Accordion.Item),
        AccordionControl: asBuilderMantineComponent(Mantine.Accordion.Control),
        AccordionPanel: asBuilderMantineComponent(Mantine.Accordion.Panel),
        Table: asBuilderMantineComponent(Mantine.Table),
        TableCaption: asBuilderMantineComponent(Mantine.Table.Caption),
        TableThead: asBuilderMantineComponent(Mantine.Table.Thead),
        TableTbody: asBuilderMantineComponent(Mantine.Table.Tbody),
        TableTfoot: asBuilderMantineComponent(Mantine.Table.Tfoot),
        TableTr: asBuilderMantineComponent(Mantine.Table.Tr),
        TableTh: asBuilderMantineComponent(Mantine.Table.Th),
        TableTd: asBuilderMantineComponent(Mantine.Table.Td),
        Timeline: asBuilderMantineComponent(Mantine.Timeline),
        TimelineItem: asBuilderMantineComponent(Mantine.Timeline.Item),
        Tree: asBuilderMantineComponent(Mantine.Tree),
        Card: asBuilderMantineComponent(Mantine.Card),
        Group: asBuilderMantineComponent(Mantine.Group),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        Text: asBuilderMantineComponent(Mantine.Text),
        Title: asBuilderMantineComponent(Mantine.Title),
        Badge: asBuilderMantineComponent(Mantine.Badge)
    }),
    ...createBuilderMantineNavigationComponents({
        Anchor: asBuilderMantineComponent(Mantine.Anchor),
        NavLink: asBuilderMantineComponent(Mantine.NavLink),
        Breadcrumbs: asBuilderMantineComponent(Mantine.Breadcrumbs),
        Button: asBuilderMantineComponent(Mantine.Button),
        Menu: asBuilderMantineComponent(Mantine.Menu),
        MenuTarget: asBuilderMantineComponent(Mantine.Menu.Target),
        MenuDropdown: asBuilderMantineComponent(Mantine.Menu.Dropdown),
        MenuItem: asBuilderMantineComponent(Mantine.Menu.Item),
        MenuLabel: asBuilderMantineComponent(Mantine.Menu.Label),
        MenuDivider: asBuilderMantineComponent(Mantine.Menu.Divider),
        Pagination: asBuilderMantineComponent(Mantine.Pagination),
        PaginationRoot: asBuilderMantineComponent(Mantine.Pagination.Root),
        PaginationControl: asBuilderMantineComponent(Mantine.Pagination.Control),
        PaginationDots: asBuilderMantineComponent(Mantine.Pagination.Dots),
        PaginationFirst: asBuilderMantineComponent(Mantine.Pagination.First),
        PaginationItems: asBuilderMantineComponent(Mantine.Pagination.Items),
        PaginationLast: asBuilderMantineComponent(Mantine.Pagination.Last),
        PaginationNext: asBuilderMantineComponent(Mantine.Pagination.Next),
        PaginationPrevious: asBuilderMantineComponent(Mantine.Pagination.Previous),
        Stepper: asBuilderMantineComponent(Mantine.Stepper),
        StepperStep: asBuilderMantineComponent(Mantine.Stepper.Step),
        StepperCompleted: asBuilderMantineComponent(Mantine.Stepper.Completed),
        TableOfContents: asBuilderMantineComponent(Mantine.TableOfContents),
        Tabs: asBuilderMantineComponent(Mantine.Tabs),
        TabsList: asBuilderMantineComponent(Mantine.Tabs.List),
        TabsTab: asBuilderMantineComponent(Mantine.Tabs.Tab),
        TabsPanel: asBuilderMantineComponent(Mantine.Tabs.Panel)
    }),
    ...createBuilderMantineOverlayComponents({
        Dialog: asBuilderMantineComponent(Mantine.Dialog),
        Modal: asBuilderMantineComponent(Mantine.Modal),
        ModalRoot: asBuilderMantineComponent(Mantine.Modal.Root),
        ModalOverlay: asBuilderMantineComponent(Mantine.Modal.Overlay),
        ModalContent: asBuilderMantineComponent(Mantine.Modal.Content),
        ModalHeader: asBuilderMantineComponent(Mantine.Modal.Header),
        ModalTitle: asBuilderMantineComponent(Mantine.Modal.Title),
        ModalCloseButton: asBuilderMantineComponent(Mantine.Modal.CloseButton),
        ModalBody: asBuilderMantineComponent(Mantine.Modal.Body),
        ModalStack: asBuilderMantineComponent(Mantine.Modal.Stack),
        ModalBase: asBuilderMantineComponent(Mantine.ModalBase),
        ModalBaseOverlay: asBuilderMantineComponent(Mantine.ModalBaseOverlay),
        ModalBaseContent: asBuilderMantineComponent(Mantine.ModalBaseContent),
        ModalBaseHeader: asBuilderMantineComponent(Mantine.ModalBaseHeader),
        ModalBaseTitle: asBuilderMantineComponent(Mantine.ModalBaseTitle),
        ModalBaseCloseButton: asBuilderMantineComponent(Mantine.ModalBaseCloseButton),
        ModalBaseBody: asBuilderMantineComponent(Mantine.ModalBaseBody),
        Drawer: asBuilderMantineComponent(Mantine.Drawer),
        DrawerRoot: asBuilderMantineComponent(Mantine.Drawer.Root),
        DrawerOverlay: asBuilderMantineComponent(Mantine.Drawer.Overlay),
        DrawerContent: asBuilderMantineComponent(Mantine.Drawer.Content),
        DrawerHeader: asBuilderMantineComponent(Mantine.Drawer.Header),
        DrawerTitle: asBuilderMantineComponent(Mantine.Drawer.Title),
        DrawerCloseButton: asBuilderMantineComponent(Mantine.Drawer.CloseButton),
        DrawerBody: asBuilderMantineComponent(Mantine.Drawer.Body),
        DrawerStack: asBuilderMantineComponent(Mantine.Drawer.Stack),
        HoverCard: asBuilderMantineComponent(Mantine.HoverCard),
        HoverCardDropdown: asBuilderMantineComponent(Mantine.HoverCard.Dropdown),
        HoverCardTarget: asBuilderMantineComponent(Mantine.HoverCard.Target),
        Popover: asBuilderMantineComponent(Mantine.Popover),
        PopoverDropdown: asBuilderMantineComponent(Mantine.Popover.Dropdown),
        PopoverTarget: asBuilderMantineComponent(Mantine.Popover.Target),
        Tooltip: asBuilderMantineComponent(Mantine.Tooltip),
        TooltipFloating: asBuilderMantineComponent(Mantine.Tooltip.Floating),
        TooltipGroup: asBuilderMantineComponent(Mantine.Tooltip.Group),
        Overlay: asBuilderMantineComponent(Mantine.Overlay),
        Portal: asBuilderMantineComponent(Mantine.Portal),
        OptionalPortal: asBuilderMantineComponent(Mantine.OptionalPortal),
        Transition: asBuilderMantineComponent(Mantine.Transition),
        FocusTrap: asBuilderMantineComponent(Mantine.FocusTrap),
        FocusTrapInitialFocus: asBuilderMantineComponent(Mantine.FocusTrapInitialFocus),
        FloatingArrow: asBuilderMantineComponent(Mantine.FloatingArrow),
        FloatingIndicator: asBuilderMantineComponent(Mantine.FloatingIndicator),
        NativeScrollArea: asBuilderMantineComponent(Mantine.NativeScrollArea),
        RemoveScroll: asBuilderMantineComponent(Mantine.RemoveScroll),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        Group: asBuilderMantineComponent(Mantine.Group)
    }),
    ...createBuilderMantineFeedbackComponents({
        Alert: asBuilderMantineComponent(Mantine.Alert),
        LoadingOverlay: asBuilderMantineComponent(Mantine.LoadingOverlay),
        Notification: asBuilderMantineComponent(Mantine.Notification),
        Loader: asBuilderMantineComponent(Mantine.Loader),
        Progress: asBuilderMantineComponent(Mantine.Progress),
        ProgressRoot: asBuilderMantineComponent(Mantine.Progress.Root),
        ProgressSection: asBuilderMantineComponent(Mantine.Progress.Section),
        ProgressLabel: asBuilderMantineComponent(Mantine.Progress.Label),
        RingProgress: asBuilderMantineComponent(Mantine.RingProgress),
        SemiCircleProgress: asBuilderMantineComponent(Mantine.SemiCircleProgress),
        Skeleton: asBuilderMantineComponent(Mantine.Skeleton),
        Group: asBuilderMantineComponent(Mantine.Group),
        Text: asBuilderMantineComponent(Mantine.Text)
    }),
    ...createBuilderMantineMediaComponents({
        BackgroundImage: asBuilderMantineComponent(Mantine.BackgroundImage),
        Image: asBuilderMantineComponent(Mantine.Image),
        Avatar: asBuilderMantineComponent(Mantine.Avatar),
        AvatarGroup: asBuilderMantineComponent(Mantine.Avatar.Group),
        ThemeIcon: asBuilderMantineComponent(Mantine.ThemeIcon),
        CheckIcon: asBuilderMantineComponent(Mantine.CheckIcon),
        CloseIcon: asBuilderMantineComponent(Mantine.CloseIcon),
        RadioIcon: asBuilderMantineComponent(Mantine.RadioIcon),
        AccordionChevron: asBuilderMantineComponent(Mantine.AccordionChevron)
    }),
    ...createBuilderMantineMarketingComponents({
        Box: asBuilderMantineComponent(Mantine.Box),
        Button: asBuilderMantineComponent(Mantine.Button),
        Card: asBuilderMantineComponent(Mantine.Card),
        Group: asBuilderMantineComponent(Mantine.Group),
        Image: asBuilderMantineComponent(Mantine.Image),
        List: asBuilderMantineComponent(Mantine.List),
        SimpleGrid: asBuilderMantineComponent(Mantine.SimpleGrid),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        Text: asBuilderMantineComponent(Mantine.Text),
        Title: asBuilderMantineComponent(Mantine.Title)
    }),
    ...createBuilderMantineDashboardComponents({
        Badge: asBuilderMantineComponent(Mantine.Badge),
        Box: asBuilderMantineComponent(Mantine.Box),
        Group: asBuilderMantineComponent(Mantine.Group),
        SimpleGrid: asBuilderMantineComponent(Mantine.SimpleGrid),
        Stack: asBuilderMantineComponent(Mantine.Stack),
        Text: asBuilderMantineComponent(Mantine.Text),
        Title: asBuilderMantineComponent(Mantine.Title)
    })
};

interface BuilderValidationIssue {
    path: string;
    message: string;
    nodeId?: string;
    componentType?: string;
    subjectId?: string;
    subjectType?: string;
}

interface BuilderJsonMonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
}

type BuilderAsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface BuilderStatusViewProps {
    kind: 'empty' | 'error' | 'loading' | 'success' | 'warning';
    title: string;
    message?: string;
    details?: React.ReactNode;
    action?: React.ReactNode;
}

function BuilderStatusView(props: BuilderStatusViewProps): React.ReactElement {
    return <div className={`builder-state builder-state-${props.kind}`} role={props.kind === 'error' ? 'alert' : 'status'}>
        <div className='builder-state-icon' aria-hidden='true' />
        <div>
            <strong>{props.title}</strong>
            {props.message && <p>{props.message}</p>}
            {props.details}
            {props.action && <div className='builder-state-action'>{props.action}</div>}
        </div>
    </div>;
}

class BuilderJsonMonacoEditor extends React.Component<BuilderJsonMonacoEditorProps> {

    protected readonly editorRef = React.createRef<HTMLDivElement>();
    protected editor: monaco.editor.IStandaloneCodeEditor | undefined;
    protected applyingExternalValue = false;

    override componentDidMount(): void {
        const node = this.editorRef.current;
        if (!node) {
            return;
        }

        this.editor = monaco.editor.create(node, {
            value: this.props.value,
            language: 'json',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'off',
            renderWhitespace: 'selection',
            fixedOverflowWidgets: true
        });
        this.editor.onDidChangeModelContent(() => {
            if (!this.applyingExternalValue) {
                this.props.onChange(this.editor?.getValue() ?? '');
            }
        });
    }

    override componentDidUpdate(): void {
        const model = this.editor?.getModel();
        if (model && model.getValue() !== this.props.value) {
            this.applyingExternalValue = true;
            model.setValue(this.props.value);
            this.applyingExternalValue = false;
        }
        this.editor?.layout();
    }

    override componentWillUnmount(): void {
        this.editor?.dispose();
        this.editor = undefined;
    }

    override render(): React.ReactNode {
        return <div className='builder-monaco-json-editor' ref={this.editorRef} aria-label='Builder JSON editor' />;
    }
}

function isSchemaObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

const RjsfForm = Form as unknown as React.ComponentType<Record<string, unknown>>;

function BuilderRjsfPropertyForm(props: BuilderRjsfFormProps): React.ReactElement {
    return <RjsfForm
        className='builder-rjsf-form'
        schema={props.schema}
        uiSchema={createBuilderRjsfUiSchema(props.schema, props.uiSchema)}
        formData={props.formData}
        validator={props.validator ?? rjsfValidator}
        widgets={{ builderColor: BuilderRjsfColorWidget }}
        liveValidate={props.liveValidate}
        omitExtraData={props.omitExtraData}
        liveOmit={props.liveOmit}
        showErrorList={props.showErrorList}
        noHtml5Validate={props.noHtml5Validate}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
    >
        {props.children}
    </RjsfForm>;
}

function createBuilderRjsfUiSchema(
    schema: Record<string, unknown>,
    uiSchema: Record<string, unknown> | undefined
): Record<string, unknown> {
    const nextUiSchema = cloneRecord(uiSchema);
    const properties = isSchemaObject(schema.properties) ? schema.properties : {};
    for (const [key, rawPropertySchema] of Object.entries(properties)) {
        const propertySchema = isSchemaObject(rawPropertySchema) ? rawPropertySchema : {};
        const existing = isSchemaObject(nextUiSchema[key]) ? nextUiSchema[key] : {};
        const placeholder = readStringFromRecord(existing, 'ui:placeholder') ?? readStringFromRecord(propertySchema, 'description');
        if (isColorLikeProperty(key, placeholder)) {
            nextUiSchema[key] = {
                ...existing,
                'ui:widget': 'builderColor'
            };
        }
    }
    return nextUiSchema;
}

function BuilderRjsfColorWidget(rawProps: Record<string, unknown>): React.ReactElement {
    const id = readStringFromRecord(rawProps, 'id');
    const label = readStringFromRecord(rawProps, 'label');
    const disabled = rawProps.disabled === true || rawProps.readonly === true;
    const value = typeof rawProps.value === 'string' ? rawProps.value : '';
    const onChange = typeof rawProps.onChange === 'function'
        ? rawProps.onChange as (value: string | undefined) => void
        : undefined;
    const htmlColor = toHtmlColorValue(value);

    return <div className='builder-rjsf-color-widget'>
        <div className='builder-rjsf-color-row'>
            <input
                id={id}
                aria-label={label}
                type='text'
                value={value}
                disabled={disabled}
                placeholder='blue, #2563eb, var(--token)'
                onChange={event => onChange?.(event.currentTarget.value || undefined)}
            />
            <input
                aria-label={`${label ?? 'Color'} picker`}
                type='color'
                value={htmlColor}
                disabled={disabled}
                onChange={event => onChange?.(event.currentTarget.value)}
            />
        </div>
        <div className='builder-color-swatches' aria-label='Color presets'>
            {Builder_THEME_COLOR_SWATCHES.map(color => <button
                key={color}
                type='button'
                title={color}
                aria-label={`Use ${color}`}
                disabled={disabled}
                style={{ background: color }}
                onClick={() => onChange?.(color)}
            />)}
        </div>
    </div>;
}

function cloneRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!value) {
        return {};
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        isSchemaObject(child) ? cloneRecord(child) : child
    ]));
}

function isColorLikeProperty(key: string, hint: string | undefined): boolean {
    return /(?:^|\.|_)(?:color|background|bg)(?:$|\.|_)/i.test(key) || /(?:color|background|theme)/i.test(hint ?? '');
}

function readStringFromRecord(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
}

function toHtmlColorValue(value: string): string {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#2563eb';
}

@injectable()
export class BuilderWidget extends ReactWidget implements Navigatable, SaveableSource {

    static readonly ID = 'builder.editor';
    static readonly LABEL = 'Page Builder';

    readonly uri: URI;
    readonly saveable: Saveable;

    protected readonly registry = createDefaultBuilderComponentRegistry();
    protected readonly actionRegistry = createDefaultBuilderActionRegistry();
    protected readonly dataSourceRegistry = createDefaultBuilderDataSourceRegistry();
    protected readonly onDirtyChangedEmitter = new Emitter<void>();
    protected readonly onContentChangedEmitter = new Emitter<void>();
    protected dirty = false;
    protected aiPrompt = '';
    protected aiPatchPreview = '';
    protected aiPendingPatch: BuilderAiPatch | undefined;
    protected aiPendingPreview: PreviewBuilderAiPatchResult | undefined;
    protected aiPatchError: string | undefined;
    protected aiStatus: BuilderAsyncStatus = 'idle';
    protected exportStatus: string | undefined;
    protected exportError: string | undefined;
    protected exportPhase: BuilderAsyncStatus = 'idle';
    protected exportPreview: { uri: URI; srcDoc: string } | undefined;
    protected loadStatus: BuilderAsyncStatus = 'loading';
    protected loadError: string | undefined;
    protected rjsfPropertyErrors: string[] = [];
    protected componentSearchQuery = '';
    protected insertSearchQuery = '';
    protected activePanel: BuilderPanel = 'components';
    protected activePanelGroup: BuilderPanelGroupId = 'build';
    protected activeLayersPanelMode: BuilderLayerPanelMode = 'tree';
    protected viewMode: PageBuilderViewMode = 'editor';
    protected previewViewport: BuilderPreviewViewport = 'desktop';
    protected activePropertiesTab: BuilderPropertiesTab = 'props';
    protected insertTargetNodeId: string | undefined;
    protected newThemeTokenKey = '';
    protected newThemeTokenValue = '';
    protected newStylePropertyKey = '';
    protected newStylePropertyValue = '';
    protected readonly editorState: BuilderEditorState;
    protected loadedFileVersion: BuilderFileVersion | undefined;
    protected loadPromise: Promise<void> | undefined;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(FileDialogService)
    protected readonly fileDialogService: FileDialogService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(BuilderService)
    protected readonly service: BuilderService;

    constructor(@inject(BuilderWidgetOptions) protected readonly options: BuilderWidgetOptions) {
        super();
        this.uri = new URI(options.uri);
        this.editorState = new BuilderEditorState({
            sourceName: this.uri.path.base,
            validateDocument: document => this.validateLoadedDocument(document)
        });
        const self = this;
        this.saveable = {
            get dirty(): boolean {
                return self.dirty;
            },
            get onDirtyChanged(): Event<void> {
                return self.onDirtyChangedEmitter.event;
            },
            get onContentChanged(): Event<void> {
                return self.onContentChangedEmitter.event;
            },
            save: () => self.save(),
            revert: () => self.revert(),
            filters: () => ({ 'CyberVinci Page': ['cvpage.json', 'builder.json'] })
        };
    }

    @postConstruct()
    protected init(): void {
        this.id = `${BuilderWidget.ID}:${this.uri.toString()}`;
        this.title.label = this.uri.path.base;
        this.title.caption = this.uri.toString();
        this.title.iconClass = codicon('layout');
        this.title.closable = true;
        this.addClass('builder-widget');
        this.toDispose.push(this.onDirtyChangedEmitter);
        this.toDispose.push(this.onContentChangedEmitter);
        this.activePanelGroup = this.getPanelGroupId(this.activePanel);
        this.loadPromise = this.load();
    }

    getUri(): URI {
        return this.uri;
    }

    getResourceUri(): URI | undefined {
        return this.uri;
    }

    createMoveToUri(resourceUri: URI): URI | undefined {
        return this.uri.withPath(resourceUri.path);
    }

    getJson(): string {
        return this.editorState.snapshot.json;
    }

    async savePage(): Promise<void> {
        await this.save();
    }

    showPreview(): void {
        this.setViewMode('preview');
    }

    showJson(): void {
        this.setViewMode('json');
    }

    getValidatedDocument(): BuilderDocument {
        const validated = this.validateDocumentForSave();
        if (!validated.valid) {
            throw new Error(validated.messages.join(' '));
        }
        return validated.document;
    }

    async stageAiPatch(prompt: string, patch: BuilderAiPatch): Promise<void> {
        await this.loadPromise;
        const snapshot = this.editorState.snapshot;
        if (!snapshot.document || snapshot.parseError || snapshot.validationIssues.length > 0 || snapshot.hasUnappliedJsonChanges) {
            throw new Error(snapshot.hasUnappliedJsonChanges
                ? 'Apply the JSON before staging an AI patch so the canonical Builder state matches the editor draft.'
                : 'Fix the current Builder document before staging an AI patch.');
        }
        this.aiPrompt = prompt;
        this.aiPendingPatch = patch;
        this.aiPendingPreview = undefined;
        this.aiPatchPreview = JSON.stringify(patch, undefined, 2);
        this.aiPatchError = undefined;
        try {
            this.aiPendingPreview = previewBuilderAiPatch(patch, {
                currentDocument: snapshot.document,
                componentRegistry: this.registry,
                actionRegistry: this.actionRegistry,
                dataSourceRegistry: this.dataSourceRegistry
            });
            this.aiStatus = 'success';
        } catch (error) {
            this.aiPatchError = error instanceof Error ? error.message : String(error);
            this.aiStatus = 'error';
        }
        this.setActivePanel('ai');
        this.update();
    }

    protected async load(): Promise<void> {
        this.loadStatus = 'loading';
        this.loadError = undefined;
        this.update();
        try {
            const content = await this.fileService.read(this.uri);
            this.loadedFileVersion = toBuilderFileVersion(content);
            this.editorState.loadJson(content.value.toString());
            this.loadStatus = 'success';
            this.setDirty(false);
        } catch (error) {
            this.loadedFileVersion = undefined;
            this.editorState.setJson('');
            this.loadStatus = 'error';
            this.loadError = error instanceof Error ? error.message : String(error);
            this.setDirty(false);
        }
        this.update();
    }

    protected async save(): Promise<void> {
        const validated = this.validateDocumentForSave();
        if (!validated.valid) {
            this.messages.error(`Builder document is invalid: ${validated.messages.join(' ')}`);
            return;
        }

        const formattedJson = `${serializeBuilderDocumentJson(validated.document, { space: 2 })}\n`;
        try {
            await persistBuilderJsonFile(this.fileService, this.uri, formattedJson, {
                expectedVersion: this.loadedFileVersion
            });
            this.loadedFileVersion = toBuilderFileVersion(await this.fileService.resolve(this.uri, { resolveMetadata: true }));
            this.editorState.markSaved(formattedJson);
            this.setDirty(false);
            this.update();
        } catch (error) {
            if (error instanceof BuilderSaveConflictError) {
                await this.handleSaveConflict(formattedJson);
                return;
            }
            throw error;
        }
    }

    protected async handleSaveConflict(memoryJson: string): Promise<void> {
        let diskJson = '';
        try {
            diskJson = (await this.fileService.read(this.uri)).value.toString();
        } catch (error) {
            this.messages.error(`Builder save conflict: the file changed on disk and could not be read: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }

        const diff = createBuilderTextDiffSummary(memoryJson, diskJson);
        const action = await this.messages.warn(
            [
                'Builder save conflict: the file changed on disk while this editor was open.',
                `Disk vs memory: +${diff.added} -${diff.removed}.`,
                diff.preview ? `\n${diff.preview}` : ''
            ].join(' '),
            'Overwrite Disk',
            'Reload Disk',
            'Keep Copy'
        );

        if (action === 'Overwrite Disk') {
            await persistBuilderJsonFile(this.fileService, this.uri, memoryJson, {
                expectedVersion: toBuilderFileVersion(await this.fileService.resolve(this.uri, { resolveMetadata: true }))
            });
            this.loadedFileVersion = toBuilderFileVersion(await this.fileService.resolve(this.uri, { resolveMetadata: true }));
            this.editorState.markSaved(memoryJson);
            this.setDirty(false);
            this.update();
            return;
        }

        if (action === 'Reload Disk') {
            this.editorState.loadJson(diskJson);
            this.loadedFileVersion = toBuilderFileVersion(await this.fileService.resolve(this.uri, { resolveMetadata: true }));
            this.setDirty(false);
            this.update();
            return;
        }

        if (action === 'Keep Copy') {
            const copyUri = createBuilderCopyUri(this.uri);
            await persistBuilderJsonFile(this.fileService, copyUri, memoryJson, { atomic: false });
            this.messages.info(`Saved Builder copy as ${copyUri.path.base}.`);
        }
    }

    protected async revert(): Promise<void> {
        this.editorState.revert();
        this.setDirty(false);
        this.update();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected setDirty(dirty: boolean): void {
        if (this.dirty !== dirty) {
            this.dirty = dirty;
            this.onDirtyChangedEmitter.fire();
        }
        this.onContentChangedEmitter.fire();
    }

    protected setJson(json: string): void {
        const snapshot = this.editorState.setJson(json);
        this.exportPhase = 'idle';
        this.exportError = undefined;
        this.setDirty(snapshot.dirty);
        this.update();
    }

    protected validateDocumentForSave(): { valid: true; document: BuilderDocument } | { valid: false; messages: string[] } {
        if (this.editorState.snapshot.hasUnappliedJsonChanges) {
            return {
                valid: false,
                messages: ['Apply the JSON before saving so the canonical Builder state matches the editor draft.']
            };
        }

        let document: BuilderDocument;

        try {
            document = this.editorState.deserializeCurrent();
        } catch (error) {
            return {
                valid: false,
                messages: [error instanceof Error ? error.message : String(error)]
            };
        }

        const structural = validateBuilderDocumentStructure(document);
        const components = validateBuilderDocumentTypesAgainstRegistry(document, this.registry);
        const actions = validateBuilderDocumentActionsAgainstRegistry(document, this.actionRegistry);
        const dataSources = validateBuilderDocumentDataSourcesAgainstRegistry(document, this.dataSourceRegistry);
        const messages = [
            ...this.enrichStructuralIssues(document, structural.errors).map(error => formatValidationMessage(error)),
            ...components.errors.map(error => formatValidationMessage(error)),
            ...actions.errors.map(error => formatValidationMessage({
                path: error.path,
                message: error.message
            })),
            ...dataSources.errors.map(error => formatValidationMessage({
                path: error.path,
                message: error.message
            }))
        ];

        if (messages.length > 0) {
            return {
                valid: false,
                messages
            };
        }

        return {
            valid: true,
            document
        };
    }

    protected formatJson(): void {
        const snapshot = this.editorState.formatJson();
        this.setDirty(snapshot.dirty);
        this.update();
    }

    protected applyJson(): void {
        const snapshot = this.editorState.applyJsonDraft();
        if (snapshot.parseError || snapshot.validationIssues.length > 0) {
            const messages = snapshot.parseError ? [snapshot.parseError] : snapshot.validationIssues.map(issue => formatValidationMessage(issue));
            this.messages.error(`Builder JSON is invalid: ${messages.join(' ')}`);
            this.update();
            return;
        }
        this.setDirty(snapshot.dirty);
        this.messages.info('JSON applied to canonical Builder state.');
        this.update();
    }

    protected restoreLastAppliedDocument(): void {
        const snapshot = this.editorState.restoreLastAppliedDocument();
        this.setDirty(snapshot.dirty);
        this.messages.info('Versao anterior restaurada a partir do ultimo documento valido aplicado.');
        this.update();
    }

    protected selectedNode(): BuilderNode | undefined {
        return this.editorState.snapshot.selectedNode;
    }

    protected selectNode(nodeId: string): void {
        this.rjsfPropertyErrors = [];
        this.editorState.selectNode(nodeId);
        this.update();
        this.focusPreviewNode(nodeId);
    }

    protected focusPreviewNode(nodeId: string): void {
        window.setTimeout(() => {
            const previewNode = this.node.querySelector(`[data-builder-node-id="${this.escapeAttributeValue(nodeId)}"]`);
            if (previewNode instanceof HTMLElement) {
                previewNode.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
                previewNode.focus({ preventScroll: true });
            }
        }, 0);
    }

    protected escapeAttributeValue(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    protected renameSelectedNode(label: string): void {
        try {
            const snapshot = this.editorState.renameSelectedNode(label);
            this.rjsfPropertyErrors = [];
            this.setDirty(snapshot.dirty);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected removeSelectedNode(): void {
        try {
            const snapshot = this.editorState.removeSelectedNode();
            this.rjsfPropertyErrors = [];
            this.setDirty(snapshot.dirty);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected duplicateSelectedNode(): void {
        try {
            const snapshot = this.editorState.duplicateSelectedNode();
            this.rjsfPropertyErrors = [];
            this.setDirty(snapshot.dirty);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected moveSelectedNode(offset: -1 | 1): void {
        try {
            const snapshot = this.editorState.moveSelectedNode(offset);
            this.rjsfPropertyErrors = [];
            this.setDirty(snapshot.dirty);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected applyDocument(document: BuilderDocument): void {
        const snapshot = this.editorState.applyDocument(document);
        this.exportPhase = 'idle';
        this.exportError = undefined;
        this.setDirty(snapshot.dirty);
        this.update();
    }

    protected setActivePanel(panel: BuilderPanel): void {
        this.activePanel = panel;
        this.activePanelGroup = this.getPanelGroupId(panel);
        this.update();
    }

    protected setLibraryPanel(panel: ComponentLibraryTab): void {
        this.activePanel = panel;
        this.activePanelGroup = 'build';
        this.update();
    }

    protected getLibraryPanel(): ComponentLibraryTab {
        return Builder_LIBRARY_TABS.has(this.activePanel)
            ? this.activePanel as ComponentLibraryTab
            : 'components';
    }

    protected setViewMode(mode: PageBuilderViewMode): void {
        this.viewMode = mode;
        this.update();
    }

    protected setPreviewViewport(viewport: BuilderPreviewViewport): void {
        this.previewViewport = viewport;
        this.update();
    }

    protected setPropertiesTab(tab: BuilderPropertiesTab): void {
        this.activePanel = 'properties';
        this.activePanelGroup = 'inspect';
        this.activePropertiesTab = tab;
        this.update();
    }

    protected setActivePanelGroup(groupId: BuilderPanelGroupId): void {
        this.activePanelGroup = groupId;
        const group = BUILDER_PANEL_GROUPS.find(candidate => candidate.id === groupId);
        if (!group) {
            this.setActivePanel('components');
            return;
        }

        if (!group.panels.includes(this.activePanel)) {
            this.setActivePanel(group.panels[0]);
            return;
        }

        this.setActivePanel(this.activePanel);
    }

    protected getPanelGroupId(panel: BuilderPanel): BuilderPanelGroupId {
        const group = BUILDER_PANEL_GROUPS.find(candidate => candidate.panels.includes(panel));
        return group?.id ?? 'build';
    }

    protected getActivePanelGroup(): BuilderPanelGroup {
        return BUILDER_PANEL_GROUPS.find(group => group.id === this.activePanelGroup)
            ?? BUILDER_PANEL_GROUPS[0];
    }

    protected getPanelDefinition(panel: BuilderPanel): BuilderPanelDefinition {
        return BUILDER_PANELS.find(candidate => candidate.id === panel) ?? BUILDER_PANELS[0];
    }

    protected setActiveLayersPanelMode(mode: BuilderLayerPanelMode): void {
        this.activeLayersPanelMode = mode;
        this.update();
    }

    protected getInsertTarget(document?: BuilderDocument): BuilderNode | undefined {
        const targetDocument = document ?? this.editorState.snapshot.document;
        if (!targetDocument) {
            return undefined;
        }
        const root = targetDocument.tree;
        if (!this.insertTargetNodeId) {
            const selectedId = this.editorState.snapshot.selectedNodeId;
            return selectedId ? findNodeById(targetDocument.tree, selectedId)?.node : root;
        }
        return findNodeById(targetDocument.tree, this.insertTargetNodeId)?.node ?? root;
    }

    protected openInsertPanel(targetNodeId?: string, typeSuggestion?: string): void {
        this.insertTargetNodeId = targetNodeId;
        if (typeSuggestion) {
            this.insertSearchQuery = typeSuggestion;
        }
        this.activeLayersPanelMode = 'tree';
        this.setActivePanel('insert');
    }

    protected clearInsertTarget(): void {
        this.insertTargetNodeId = undefined;
        this.setActiveLayersPanelMode('tree');
    }

    protected addNodeToInsertTarget(type: string): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const parent = this.getInsertTarget(document) ?? document.tree;
        if (!this.canAddChild(parent, type)) {
            this.messages.warn(`Cannot add ${type} inside ${parent.type}; this component does not allow that child type.`);
            return;
        }
        this.addDefaultChild(type, parent.id);
    }

    protected addDefaultChild(type: string, parentId?: string, slotName?: string, index?: number): void {
        const { document, selectedNodeId } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const targetParentId = parentId ?? selectedNodeId ?? document.tree.id;
        const location = findNodeById(document.tree, targetParentId);
        const parent = location?.node ?? document.tree;
        if (!this.canAddChild(parent, type, slotName)) {
            this.messages.warn(`Cannot add ${type} inside ${parent.type}; this component does not allow that child type.`);
            return;
        }
        const node = this.registry.createDefaultNode(type, {
            existingTree: document.tree,
            includeDefaultChildren: true
        });
        try {
            const nextDocument = insertNode(document, {
                parentId: parent.id,
                node,
                slotName,
                index
            });
            this.applyDocument(nextDocument);
            this.editorState.selectNode(node.id);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected addBlockTemplate(template: BuilderBlockTemplate): void {
        const { document, selectedNodeId } = this.editorState.snapshot;
        if (!document) {
            return;
        }

        const targetParentId = selectedNodeId ?? document.tree.id;
        const parent = findNodeById(document.tree, targetParentId)?.node ?? document.tree;
        const existingIds = this.collectNodeIds(document.tree);
        const nodes = template.nodes.map(node => this.cloneNodeForInsert(node, existingIds));
        const unsupported = nodes.find(node => !this.canAddChild(parent, node.type));
        if (unsupported) {
            this.messages.warn(`Cannot add ${unsupported.type} inside ${parent.type}; this component does not allow that child type.`);
            return;
        }

        try {
            let nextDocument = document;
            for (const node of nodes) {
                nextDocument = insertNode(nextDocument, {
                    parentId: parent.id,
                    node
                });
            }
            if (this.applyValidDocument(nextDocument, 'Cannot insert block template')) {
                this.editorState.selectNode(nodes[0]?.id ?? parent.id);
                this.update();
            }
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected canAddChild(parent: BuilderNode, childType: string, slotName?: string): boolean {
        const parentDefinition = this.registry.get(parent.type);
        if (slotName) {
            const slot = parentDefinition?.slots?.[slotName];
            return !!slot && (slot.allowedChildren === undefined || slot.allowedChildren.includes(childType));
        }
        return parentDefinition?.allowedChildren === undefined || parentDefinition.allowedChildren.includes(childType);
    }

    protected applyValidDocument(document: BuilderDocument, errorPrefix: string): boolean {
        const issues = this.validateCandidateDocument(document);
        if (issues.length > 0) {
            this.messages.error(`${errorPrefix}: ${issues.map(issue => formatValidationMessage(issue)).join(' ')}`);
            return false;
        }
        this.applyDocument(document);
        return true;
    }

    protected validateCandidateDocument(document: BuilderDocument): BuilderValidationIssue[] {
        const structural = validateBuilderDocumentStructure(document);
        return [
            ...this.enrichStructuralIssues(document, structural.errors),
            ...this.validateLoadedDocument(document)
        ];
    }

    protected cloneDocument(document: BuilderDocument): BuilderDocument {
        return JSON.parse(JSON.stringify(document)) as BuilderDocument;
    }

    protected cloneNodeForInsert(node: BuilderNode, existingIds: Set<string>): BuilderNode {
        const clone = JSON.parse(JSON.stringify(node)) as BuilderNode;
        this.reassignNodeIds(clone, existingIds);
        return clone;
    }

    protected reassignNodeIds(node: BuilderNode, existingIds: Set<string>): void {
        node.id = this.createAvailableNodeId(node.type, existingIds);
        existingIds.add(node.id);
        for (const child of node.children ?? []) {
            this.reassignNodeIds(child, existingIds);
        }
        for (const slotNodes of Object.values(node.slots ?? {})) {
            for (const slotNode of slotNodes) {
                this.reassignNodeIds(slotNode, existingIds);
            }
        }
        for (const emptyStateNode of node.data?.emptyState ?? []) {
            this.reassignNodeIds(emptyStateNode, existingIds);
        }
    }

    protected createAvailableNodeId(type: string, existingIds: Set<string>): string {
        const base = type.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase() || 'node';
        let candidate = base;
        let index = 2;
        while (existingIds.has(candidate)) {
            candidate = `${base}-${index++}`;
        }
        return candidate;
    }

    protected collectNodeIds(node: BuilderNode, ids: Set<string> = new Set<string>()): Set<string> {
        ids.add(node.id);
        for (const child of node.children ?? []) {
            this.collectNodeIds(child, ids);
        }
        for (const slotNodes of Object.values(node.slots ?? {})) {
            for (const slotNode of slotNodes) {
                this.collectNodeIds(slotNode, ids);
            }
        }
        for (const emptyStateNode of node.data?.emptyState ?? []) {
            this.collectNodeIds(emptyStateNode, ids);
        }
        return ids;
    }

    protected startComponentDrag(event: React.DragEvent<HTMLElement>, type: string): void {
        event.dataTransfer.setData(Builder_COMPONENT_DRAG_MIME, type);
        event.dataTransfer.effectAllowed = 'copy';
    }

    protected startNodeDrag(event: React.DragEvent<HTMLElement>, nodeId: string): void {
        event.dataTransfer.setData(Builder_NODE_DRAG_MIME, nodeId);
        event.dataTransfer.effectAllowed = 'move';
    }

    protected handleComponentDragOver(event: React.DragEvent<HTMLElement>, parentId?: string, slotName?: string): void {
        if (event.dataTransfer.types.includes(Builder_NODE_DRAG_MIME)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            return;
        }

        if (event.dataTransfer.types.includes(Builder_COMPONENT_DRAG_MIME)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    protected handleComponentDrop(event: React.DragEvent<HTMLElement>, parentId?: string, slotName?: string, index?: number): void {
        const nodeId = event.dataTransfer.getData(Builder_NODE_DRAG_MIME);
        if (nodeId) {
            event.preventDefault();
            event.stopPropagation();
            this.moveExistingNode(nodeId, parentId, slotName, index);
            return;
        }

        const type = event.dataTransfer.getData(Builder_COMPONENT_DRAG_MIME);
        if (!type) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.addDefaultChild(type, parentId, slotName, index);
    }

    protected moveExistingNode(nodeId: string, parentId?: string, slotName?: string, index?: number): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const targetParentId = parentId ?? document.tree.id;
        const moved = findNodeById(document.tree, nodeId)?.node;
        const parent = findNodeById(document.tree, targetParentId)?.node;
        if (!moved || !parent) {
            return;
        }
        if (!this.canAddChild(parent, moved.type, slotName)) {
            this.messages.warn(`Cannot move ${moved.type} inside ${parent.type}; this component does not allow that child type.`);
            return;
        }
        try {
            const nextDocument = moveNode(document, {
                nodeId,
                parentId: targetParentId,
                slotName,
                index
            });
            this.applyDocument(nextDocument);
            this.editorState.selectNode(nodeId);
            this.update();
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected updateSelectedProps(props: Record<string, BuilderJsonValue>): void {
        const snapshot = this.editorState.updateSelectedProps(props);
        if (!snapshot.propsError) {
            this.rjsfPropertyErrors = [];
        }
        this.setDirty(snapshot.dirty);
        this.update();
    }

    protected updateDocumentTheme(patch: Partial<BuilderTheme>): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const nextDocument = this.cloneDocument(document);
        nextDocument.theme = this.cleanUndefined({
            ...(nextDocument.theme ?? {}),
            ...patch
        }) as BuilderTheme;
        this.applyValidDocument(nextDocument, 'Cannot update theme');
    }

    protected updateDocumentThemeSpacing(size: string, value: string): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        this.updateDocumentTheme({
            spacing: this.cleanUndefined({
                ...(document.theme?.spacing ?? {}),
                [size]: value.trim() === '' ? undefined : value
            }) as BuilderTheme['spacing']
        });
    }

    protected resetDocumentTheme(): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const nextDocument = this.cloneDocument(document);
        const defaultTheme = this.createDefaultTheme();
        nextDocument.theme = {
            ...defaultTheme,
            spacing: {
                ...(defaultTheme.spacing ?? {})
            },
            tokens: {
                ...(defaultTheme.tokens ?? {})
            }
        };
        this.applyValidDocument(nextDocument, 'Cannot reset theme');
    }

    protected applyThemePreset(preset: { patch: Partial<BuilderTheme> }): void {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const currentTokens = isSchemaObject(document.theme?.tokens) ? document.theme?.tokens as Record<string, unknown> : {};
        this.updateDocumentTheme({
            ...preset.patch,
            tokens: this.cleanUndefined({
                ...currentTokens,
                ...(preset.patch.tokens ?? {})
            }) as BuilderTheme['tokens']
        });
    }

    protected createDefaultTheme(): BuilderTheme {
        const { document } = this.editorState.snapshot;
        if (!document) {
            throw new Error('No document loaded to create default theme.');
        }
        return {
            ...Builder_DEFAULT_THEME,
            spacing: {
                ...(Builder_DEFAULT_THEME.spacing ?? {})
            },
            tokens: {
                ...(Builder_DEFAULT_THEME.tokens ?? {})
            }
        };
    }

    protected applyThemePresetToken(token: string, value: string): void {
        this.updateThemeToken(token, value);
    }

    protected async updateThemeToken(tokenKey: string, tokenValue: string): Promise<void> {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const currentThemeTokens = isSchemaObject(document.theme?.tokens) ? document.theme.tokens as Record<string, unknown> : {};
        const nextTokens = {
            ...currentThemeTokens,
            [tokenKey]: tokenValue.trim() === '' ? undefined : tokenValue
        } as BuilderTheme['tokens'];
        this.updateDocumentTheme({
            tokens: this.cleanUndefined(nextTokens as Record<string, unknown>) as BuilderTheme['tokens']
        });
    }

    protected async removeThemeToken(tokenKey: string): Promise<void> {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return;
        }
        const nextTokens = this.cloneRecordStringMap(isSchemaObject(document.theme?.tokens) ? document.theme.tokens as Record<string, unknown> : undefined);
        delete nextTokens[tokenKey];
        this.updateDocumentTheme({
            tokens: this.cleanUndefined(nextTokens) as BuilderTheme['tokens']
        });
    }

    protected async addThemeToken(): Promise<void> {
        const key = this.newThemeTokenKey.trim();
        if (!key) {
            this.messages.warn('Informe uma chave para o token.');
            return;
        }
        const trimmedValue = this.newThemeTokenValue.trim();
        await this.updateThemeToken(key, trimmedValue);
        this.newThemeTokenKey = '';
        this.newThemeTokenValue = '';
    }

    protected updateSelectedStyleCss(property: string, value: string): void {
        this.updateSelectedStyle(undefined, {
            [property]: value.trim() === '' ? undefined : value
        });
    }

    protected clearSelectedStyleCss(property: string): void {
        this.updateSelectedStyleCss(property, '');
    }

    protected updateSelectedClassName(value: string): void {
        this.updateSelectedStyle({
            className: value.trim() === '' ? undefined : value.trim()
        });
    }

    protected resetSelectedStyle(): void {
        const { document, selectedNodeId } = this.editorState.snapshot;
        if (!document || !selectedNodeId) {
            return;
        }
        const nextDocument = this.cloneDocument(document);
        const location = findNodeById(nextDocument.tree, selectedNodeId);
        if (!location) {
            return;
        }
        location.node.style = undefined;
        this.applyValidDocument(nextDocument, 'Cannot reset selected style');
    }

    protected applySelectedStylePreset(preset: BuilderStylePreset): void {
        this.updateSelectedStyle(undefined, preset.css);
    }

    protected updateSelectedStyle(stylePatch: Partial<BuilderStyle> | undefined, cssPatch: Record<string, string | number | undefined> = {}): void {
        const { document, selectedNodeId } = this.editorState.snapshot;
        if (!document || !selectedNodeId) {
            return;
        }
        const nextDocument = this.cloneDocument(document);
        const location = findNodeById(nextDocument.tree, selectedNodeId);
        if (!location) {
            return;
        }

        const nextCss = this.cleanUndefined({
            ...(location.node.style?.css ?? {}),
            ...cssPatch
        }) as Record<string, string | number>;
        const nextStyle = this.cleanUndefined({
            ...(location.node.style ?? {}),
            ...(stylePatch ?? {}),
            css: Object.keys(nextCss).length > 0 ? nextCss : undefined
        }) as BuilderStyle;
        location.node.style = Object.keys(nextStyle).length > 0 ? nextStyle : undefined;

        this.applyValidDocument(nextDocument, 'Cannot update selected style');
    }

    protected cleanUndefined(value: Record<string, unknown>): Record<string, unknown> {
        const clean = { ...value };
        for (const [key, child] of Object.entries(clean)) {
            if (child === undefined || child === '') {
                delete clean[key];
            }
        }
        return clean;
    }

    protected cloneRecordStringMap(input: Record<string, unknown> | undefined): Record<string, string> {
        const output: Record<string, string> = {};
        if (!input) {
            return output;
        }
        for (const [key, value] of Object.entries(input)) {
            if (typeof value === 'string') {
                output[key] = value;
            } else if (value === undefined || value === null) {
                output[key] = '';
            } else {
                output[key] = JSON.stringify(value);
            }
        }
        return output;
    }

    protected async generateAiPatch(): Promise<void> {
        const prompt = this.aiPrompt.trim();
        if (!prompt) {
            this.messages.warn('Describe the UI change before generating an AI patch.');
            return;
        }
        const snapshot = this.editorState.snapshot;
        if (!snapshot.document || snapshot.parseError || snapshot.validationIssues.length > 0 || snapshot.hasUnappliedJsonChanges) {
            this.messages.error(snapshot.hasUnappliedJsonChanges
                ? 'Apply the JSON before generating an AI patch so the canonical Builder state matches the editor draft.'
                : 'Fix the current Builder document before generating an AI patch.');
            return;
        }
        this.aiStatus = 'loading';
        this.aiPatchError = undefined;
        this.aiPatchPreview = '';
        this.aiPendingPatch = undefined;
        this.aiPendingPreview = undefined;
        this.update();

        try {
            const result = await this.service.generateUiWithAi({
                prompt,
                currentJson: snapshot.json,
                selectedNodeId: snapshot.selectedNodeId,
                operationScope: 'selectedComponent'
            });
            const unsupportedOperation = result.patch.operations.find(operation =>
                operation.type !== 'updateNodeProps' && operation.type !== 'insertNode'
            );
            if (unsupportedOperation) {
                this.aiPendingPatch = undefined;
                this.aiPendingPreview = undefined;
                this.aiPatchPreview = JSON.stringify(result.patch, undefined, 2);
                this.aiPatchError = `Selected-component AI flow only accepts updateNodeProps or insertNode, received ${unsupportedOperation.type}.`;
                this.aiStatus = 'error';
                this.update();
                return;
            }
            await this.stageAiPatch(prompt, result.patch);
        } catch (error) {
            this.aiPendingPatch = undefined;
            this.aiPendingPreview = undefined;
            this.aiPatchPreview = '';
            this.aiPatchError = error instanceof Error ? error.message : String(error);
            this.aiStatus = 'error';
            this.update();
            return;
        }
        this.update();
    }

    protected async acceptAiPatch(): Promise<void> {
        const snapshot = this.editorState.snapshot;
        if (!this.aiPendingPatch || !snapshot.document) {
            return;
        }
        try {
            const result = applyBuilderAiPatch(this.aiPendingPatch, {
                currentDocument: snapshot.document,
                componentRegistry: this.registry,
                actionRegistry: this.actionRegistry,
                dataSourceRegistry: this.dataSourceRegistry
            });
            this.applyDocument(result.document);
            this.aiPendingPatch = undefined;
            this.aiPendingPreview = undefined;
            this.aiPatchPreview = '';
            this.aiPatchError = undefined;
            this.aiStatus = 'idle';
            await this.save();
            this.messages.info(`Applied and saved ${result.appliedOperations} Builder AI operation${result.appliedOperations === 1 ? '' : 's'}.`);
            this.update();
        } catch (error) {
            this.aiPatchError = error instanceof Error ? error.message : String(error);
            this.aiStatus = 'error';
            this.messages.error(this.aiPatchError);
            this.update();
        }
    }

    protected rejectAiPatch(): void {
        this.aiPendingPatch = undefined;
        this.aiPendingPreview = undefined;
        this.aiPatchPreview = '';
        this.aiPatchError = undefined;
        this.aiStatus = 'idle';
        this.messages.info('Rejected the pending Builder AI patch.');
        this.update();
    }

    protected async exportHtml(): Promise<void> {
        const { parseError, validationIssues, json, hasUnappliedJsonChanges } = this.editorState.snapshot;
        if (parseError || validationIssues.length > 0 || hasUnappliedJsonChanges) {
            const messages = parseError ? [parseError] : validationIssues.map(issue => formatValidationMessage(issue));
            this.messages.error(hasUnappliedJsonChanges
                ? 'Apply the JSON before exporting so the canonical Builder state matches the editor draft.'
                : `Builder document is invalid: ${messages.join(' ')}`);
            return;
        }
        const exportDir = await this.selectExportDirectory();
        if (!exportDir) {
            return;
        }
        this.exportPhase = 'loading';
        this.exportError = undefined;
        this.exportStatus = undefined;
        this.update();
        try {
            const result = await this.service.exportHtml({ json });
            await this.writeExportFiles(exportDir, result.files);
            this.exportPreview = {
                uri: exportDir.resolve('index.html'),
                srcDoc: this.createExportPreviewSrcDoc(result.files)
            };
            await this.openExportPreview(exportDir, result.files);
            this.exportStatus = `Exported ${Object.keys(result.files).join(', ')} to ${exportDir.path.toString()}`;
            this.exportPhase = 'success';
            this.messages.info(this.exportStatus);
        } catch (error) {
            this.exportError = error instanceof Error ? error.message : String(error);
            this.exportPhase = 'error';
            this.messages.error(`Builder HTML export failed: ${this.exportError}`);
        }
        this.update();
    }

    protected async selectExportDirectory(): Promise<URI | undefined> {
        return this.fileDialogService.showOpenDialog({
            title: 'Select HTML export destination',
            openLabel: 'Export Here',
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        }, await this.fileService.resolve(this.uri.parent));
    }

    protected async writeExportFiles(exportDir: URI, files: Record<string, string>): Promise<void> {
        await this.fileService.createFolder(exportDir);
        await Promise.all(Object.entries(files).map(([name, content]) => this.writeExportFile(exportDir, name, content)));
    }

    protected async writeExportFile(exportDir: URI, relativeName: string, content: string): Promise<void> {
        const segments = relativeName.split(/[\\/]+/).filter(Boolean);
        if (segments.length === 0 || segments.some(segment => segment === '.' || segment === '..')) {
            throw new Error(`Invalid Builder export file path: ${relativeName}`);
        }

        let directory = exportDir;
        for (const segment of segments.slice(0, -1)) {
            directory = directory.resolve(`${segment}/`);
            await this.fileService.createFolder(directory);
        }
        await this.fileService.writeFile(directory.resolve(segments[segments.length - 1]), BinaryBuffer.fromString(content));
    }

    protected async openExportPreview(exportDir: URI, files: Record<string, string>): Promise<void> {
        if (!Object.prototype.hasOwnProperty.call(files, 'index.html')) {
            return;
        }

        const previewUri = exportDir.resolve('index.html');
        try {
            await open(this.openerService, previewUri, { activate: true });
        } catch (error) {
            this.messages.warn(`HTML export completed, but the generated preview could not be opened automatically: ${previewUri.path.toString()}`);
        }
    }

    protected createExportPreviewSrcDoc(files: Record<string, string>): string {
        const html = files['index.html'] ?? '<!doctype html><html><body></body></html>';
        const styles = files['styles.css'];
        if (!styles) {
            return html;
        }
        const styleTag = `<style data-builder-export-preview>\n${styles}\n</style>`;
        if (html.includes('<link rel="stylesheet" href="./styles.css">')) {
            return html.replace('<link rel="stylesheet" href="./styles.css">', styleTag);
        }
        if (html.includes('</head>')) {
            return html.replace('</head>', `${styleTag}\n</head>`);
        }
        return `${styleTag}\n${html}`;
    }

    protected render(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const hasCurrentJsonErrors = !!snapshot.parseError || snapshot.validationIssues.length > 0;
        const cannotUseCanonicalState = hasCurrentJsonErrors || snapshot.hasUnappliedJsonChanges;
        const document = snapshot.document;
        const selectedNode = snapshot.selectedNode ?? document?.tree;
        const selectedLocation = document && selectedNode ? findNodeById(document.tree, selectedNode.id) : undefined;
        const selectedLabel = selectedNode ? this.getNodeLayerLabel(selectedNode) : undefined;
        const selectedPath = selectedLocation ? this.formatNodePath(selectedLocation.path, selectedLocation.node) : undefined;
        const libraryPanel = this.getLibraryPanel();
        const canExport = !cannotUseCanonicalState && !!document;
        const inspectorContent = Builder_LIBRARY_PANELS.has(this.activePanel) || this.activePanel === 'properties'
            ? this.renderProperties({ tab: this.activePropertiesTab })
            : this.renderActivePanelBody(this.activePanel);

        return <PageBuilderApp
            toolbar={{
                fileName: this.uri.path.base,
                dirty: this.dirty,
                viewMode: this.viewMode,
                canSave: this.dirty && !cannotUseCanonicalState,
                canExport,
                onNew: () => this.commandService.executeCommand(BuilderCommands.NEW_PAGE.id),
                onOpen: () => this.commandService.executeCommand(BuilderCommands.OPEN_PAGE_JSON.id),
                onSave: () => this.save(),
                onExportReact: () => this.commandService.executeCommand(BuilderCommands.EXPORT_REACT.id, this),
                onExportHtml: () => this.exportHtml(),
                onViewModeChange: mode => this.setViewMode(mode)
            }}
            library={{
                activeTab: libraryPanel,
                onTabChange: tab => this.setLibraryPanel(tab),
                children: this.renderActivePanelBody(libraryPanel),
                layers: this.renderActivePanelBody('layers')
            }}
            canvas={{
                selectedLabel,
                selectedType: selectedNode?.type,
                selectedPath,
                actions: this.renderVisualSelectionToolbar(),
                onDragOver: event => {
                    if (document) {
                        this.handleComponentDragOver(event, document.tree.id);
                    }
                },
                onDrop: event => {
                    if (document) {
                        this.handleComponentDrop(event, document.tree.id);
                    }
                },
                children: this.renderPreview({ selectable: true })
            }}
            preview={{
                viewport: this.previewViewport,
                onViewportChange: viewport => this.setPreviewViewport(viewport),
                children: this.renderPreview({ selectable: false })
            }}
            json={{
                dirty: this.dirty,
                hasUnappliedChanges: snapshot.hasUnappliedJsonChanges,
                children: this.renderJsonEditor()
            }}
            properties={{
                activeTab: this.activePropertiesTab,
                selectedLabel,
                selectedType: selectedNode?.type,
                onTabChange: tab => this.setPropertiesTab(tab),
                children: inspectorContent
            }}
        />;
    }

    protected renderToolRail(): React.ReactNode {
        return BUILDER_PANEL_GROUPS.map(group => <section
            className={`builder-tool-rail-group${this.activePanelGroup === group.id ? ' active' : ''}`}
            key={group.id}
            aria-label={`${group.title} tools`}
        >
            <div className='builder-tool-rail-label' title={group.title}>
                <span className={codicon(group.icon)} aria-hidden='true' />
                <span>{group.title}</span>
            </div>
            <div className='builder-tool-rail-buttons'>
                {group.panels.map(panelId => {
                    const definition = this.getPanelDefinition(panelId);
                    const isPanelActive = this.activePanel === panelId;
                    return <button
                        key={panelId}
                        type='button'
                        className={`builder-tool-rail-button${isPanelActive ? ' active' : ''}`}
                        title={definition.title}
                        aria-label={`${definition.title} panel`}
                        aria-pressed={isPanelActive}
                        onClick={() => this.setActivePanel(panelId)}
                    >
                        <span className={codicon(definition.icon)} aria-hidden='true' />
                        <span className='builder-tool-rail-button-label'>{definition.title}</span>
                    </button>;
                })}
            </div>
        </section>);
    }

    protected renderPanelNavigation(group: BuilderPanelGroup): React.ReactNode {
        return <div className='builder-panel-navigation' role='tablist' aria-label={`Painel: ${group.title}`}>
            {group.panels.map(panelId => {
                const definition = this.getPanelDefinition(panelId);
                const isActive = this.activePanel === panelId;
                return <button
                    key={panelId}
                    type='button'
                    role='tab'
                    aria-selected={isActive}
                    className={isActive ? 'active' : undefined}
                    title={definition.title}
                    onClick={() => this.setActivePanel(panelId)}
                >
                    <span className={codicon(definition.icon)} aria-hidden='true' />
                    <span>{definition.title}</span>
                </button>;
            })}
        </div>;
    }

    protected renderActivePanel(): React.ReactNode {
        const panel = BUILDER_PANELS.find(item => item.id === this.activePanel) ?? BUILDER_PANELS[0];
        const group = this.getActivePanelGroup();
        return <div className='builder-active-panel'>
            <div className='builder-active-panel-header'>
                <div className='builder-active-panel-header-group'>
                    <span className={`codicon ${codicon(group.icon)}`} aria-hidden='true' />
                    <h2>{group.title}</h2>
                    <span>{panel.title}</span>
                </div>
            </div>
            <div className='builder-pane-heading'>
                <h3>{panel.title}</h3>
                <span>{this.renderActivePanelSummary(panel.id)}</span>
            </div>
            {this.renderActivePanelContextBar()}
            <div className='builder-active-panel-body'>
                {this.renderActivePanelBody(panel.id)}
            </div>
        </div>;
    }

    protected renderPrimaryWorkflowSwitch(): React.ReactNode {
        return <div className='builder-workflow-switch' role='tablist' aria-label='Primary builder panels'>
            {BUILDER_WORKFLOW_PANELS.map(panelId => {
                const definition = this.getPanelDefinition(panelId);
                const isActive = this.activePanel === panelId;
                const badge = this.renderWorkflowPanelBadge(panelId);
                return <button
                    key={panelId}
                    type='button'
                    role='tab'
                    aria-selected={isActive}
                    className={isActive ? 'active' : undefined}
                    title={definition.ariaLabel ?? definition.title}
                    onClick={() => this.setActivePanel(panelId)}
                >
                    <span className={codicon(definition.icon)} aria-hidden='true' />
                    <span>{definition.title}</span>
                    {badge && <small>{badge}</small>}
                </button>;
            })}
        </div>;
    }

    protected renderWorkflowPanelBadge(panel: BuilderPanel): string | undefined {
        const snapshot = this.editorState.snapshot;
        if (panel === 'components') {
            return String(this.registry.list().length);
        }
        if (panel === 'blocks') {
            return String(BUILDER_BLOCK_TEMPLATES.length);
        }
        if (panel === 'layers' && snapshot.document) {
            return String(this.countNodes(snapshot.document.tree));
        }
        if (panel === 'properties') {
            return snapshot.selectedNode?.type;
        }
        if (panel === 'theme') {
            return snapshot.document?.theme?.primaryColor ?? snapshot.document?.theme?.mode;
        }
        return undefined;
    }

    protected renderActivePanelContextBar(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const { document } = snapshot;
        if (!document) {
            return undefined;
        }
        const selectedNode = snapshot.selectedNode ?? document.tree;
        const selectedLabel = this.getNodeLayerLabel(selectedNode);
        const styleRules = this.countStyleRules(selectedNode);

        return <div className='builder-context-strip' aria-label='Selected layer context'>
            <div className='builder-context-target'>
                <span className={codicon(Builder_COMPONENT_TYPE_ICONS[selectedNode.type] ?? 'symbol-misc')} aria-hidden='true' />
                <strong>{selectedLabel}</strong>
                <code>{selectedNode.type}</code>
                {styleRules > 0 && <small>{styleRules} style</small>}
            </div>
        </div>;
    }

    protected countNodes(node: BuilderNode): number {
        return 1
            + (node.children ?? []).reduce((total, child) => total + this.countNodes(child), 0)
            + Object.values(node.slots ?? {}).reduce((total, slotNodes) =>
                total + slotNodes.reduce((slotTotal, child) => slotTotal + this.countNodes(child), 0), 0);
    }

    protected countStyleRules(node: BuilderNode): number {
        return Object.keys(node.style?.css ?? {}).length + (node.style?.className ? 1 : 0);
    }

    protected renderActivePanelSummary(panel: BuilderPanel): string {
        const snapshot = this.editorState.snapshot;
        if (panel === 'components') {
            return `${this.registry.list().length} available`;
        }
        if (panel === 'insert') {
            if (!snapshot.document) {
                return 'No document';
            }
            const target = this.getInsertTarget(snapshot.document);
            return `Insert into ${target ? this.getNodeLayerLabel(target) : 'page root'}`;
        }
        if (panel === 'layers') {
            return snapshot.selectedNode ? snapshot.selectedNode.type : 'No selection';
        }
        if (panel === 'properties') {
            return snapshot.selectedNode ? snapshot.selectedNode.id : 'Select a layer';
        }
        if (panel === 'theme') {
            return snapshot.document?.theme?.mode ?? 'No document';
        }
        if (panel === 'data') {
            const document = snapshot.document;
            return document ? `${Object.keys(document.dataSources ?? {}).length} sources` : 'No document';
        }
        if (panel === 'json') {
            return snapshot.hasUnappliedJsonChanges ? 'Unapplied draft' : 'Applied';
        }
        return this.uri.path.base;
    }

    protected renderActivePanelBody(panel: BuilderPanel): React.ReactNode {
        switch (panel) {
            case 'components':
                return this.renderComponentToolbox();
            case 'insert':
                return this.renderInsertPanel();
            case 'blocks':
                return this.renderBlocksPanel();
            case 'layers':
                return this.renderLayersPanel();
            case 'properties':
                return this.renderProperties({ showSchemaModel: false });
            case 'theme':
                return this.renderThemePanel();
            case 'data':
                return this.renderDataActionsPanel();
            case 'ai':
                return this.renderAi();
            case 'export':
                return this.renderExport();
            case 'json':
                return this.renderInspector();
        }
    }

    protected renderInsertPanel(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const { document } = snapshot;
        if (!document) {
            return <BuilderStatusView
                kind='empty'
                title='No document loaded'
                message='Open a valid Builder document before adding components.'
            />;
        }

        const query = this.insertSearchQuery.trim().toLowerCase();
        const queryMatches = query
            ? this.registry.list().filter(definition => this.matchesComponentSearch(definition, query))
            : this.registry.list();
        const insertTarget = this.getInsertTarget(document);
        const insertTargetLabel = insertTarget ? this.getNodeLayerLabel(insertTarget) : 'Page root';
        const quickInsert = Builder_LAYER_QUICK_INSERT_TYPES
            .filter(type => this.canAddChild(insertTarget ?? document.tree, type))
            .filter(type => !query || type.toLowerCase().includes(query));

        return <section className='builder-panel builder-insert-panel'>
            <div className='builder-panel-toolbar builder-panel-toolbar--padded'>
                <h3>Novo componente</h3>
                <p className='builder-panel-note'>Escolha o destino e o tipo de componente para inserir.</p>
            </div>
            <div className='builder-layer-context'>
                <strong>Inserindo em</strong>
                <span>{insertTargetLabel}</span>
            </div>
            <div className='builder-insert-tools'>
                <button
                    type='button'
                    onClick={() => this.clearInsertTarget()}
                    title='Use page root as insertion target'
                >
                    <span className={codicon('root-folder')} aria-hidden='true' /> Root
                </button>
            </div>
            <label className='builder-toolbox-search'>
                <span className={codicon('search')} aria-hidden='true' />
                <input
                    type='search'
                    value={this.insertSearchQuery}
                    placeholder='Search component to insert'
                    aria-label='Search components to insert'
                    onChange={event => {
                        this.insertSearchQuery = event.currentTarget.value;
                        this.update();
                    }}
                />
                {this.insertSearchQuery && <button
                    type='button'
                    className='builder-toolbox-clear'
                    title='Clear insert component search'
                    aria-label='Clear insert component search'
                    onClick={() => {
                        this.insertSearchQuery = '';
                        this.update();
                    }}
                >
                    <span className={codicon('close')} aria-hidden='true' />
                </button>}
            </label>
            {quickInsert.length > 0 && <div className='builder-layer-quick-insert'>
                <span>Sugestões rápidas</span>
                <div>
                    {quickInsert.map(type => {
                        const definition = this.registry.get(type);
                        return <button
                            key={type}
                            type='button'
                            title={`Add ${definition?.displayName ?? type}`}
                            onClick={() => this.addNodeToInsertTarget(type)}
                        >
                            <span>{definition?.displayName ?? type}</span>
                        </button>;
                    })}
                </div>
            </div>}
            <div className='builder-insert-separator' />
            {queryMatches.length === 0
                ? <BuilderStatusView kind='empty' title='No components match' message={`No component matches '${this.insertSearchQuery}'.`} />
                : Builder_COMPONENT_CATEGORIES.map(category => this.renderInsertComponentToolboxCategory(category, queryMatches))}
        </section>;
    }

    protected renderJsonEditor(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const hasCurrentJsonErrors = !!snapshot.parseError || snapshot.validationIssues.length > 0;
        return <section className='builder-json'>
            <div className='builder-pane-heading'>
                <h3>JSON</h3>
                {snapshot.hasUnappliedJsonChanges && <span>Unapplied draft</span>}
            </div>
            <BuilderJsonMonacoEditor
                value={snapshot.json}
                onChange={value => this.setJson(value)}
            />
            <aside className='builder-json-sidebar'>
                <div className='builder-json-actions'>
                    <button
                        type='button'
                        onClick={() => this.applyJson()}
                        disabled={hasCurrentJsonErrors || !snapshot.hasUnappliedJsonChanges}
                    >
                        Aplicar JSON
                    </button>
                    <button
                        type='button'
                        onClick={() => this.restoreLastAppliedDocument()}
                        disabled={!snapshot.hasUnappliedJsonChanges}
                    >
                        Restaurar versao anterior
                    </button>
                    {snapshot.hasUnappliedJsonChanges && <p className='builder-panel-note'>O preview usa o ultimo JSON aplicado.</p>}
                </div>
                {this.renderValidationSummary()}
            </aside>
        </section>;
    }

    protected renderLayersPanel(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const { document } = snapshot;
        const selectedLocation = snapshot.document && snapshot.selectedNodeId
            ? findNodeById(snapshot.document.tree, snapshot.selectedNodeId)
            : undefined;
        const insertionTarget = selectedLocation?.node ?? document?.tree;
        const layersTargetLabel = insertionTarget ? this.getNodeLayerLabel(insertionTarget) : 'Raiz';
        const insertionMode = this.activeLayersPanelMode;

        if (this.loadStatus === 'loading') {
            return <section className='builder-panel'>
                <BuilderStatusView kind='loading' title='Loading layers' message='Waiting for the Builder document to load.' />
            </section>;
        }
        if (!document) {
            return <section className='builder-panel'>
                {snapshot.json.trim()
                    ? this.renderInspector()
                    : <BuilderStatusView kind='empty' title='No layers yet' message='A valid Builder document is required before visual layers are available.' />}
            </section>;
        }
        return <div className='builder-layers-panel'>
            <div className='builder-layers-toolbar' role='tablist' aria-label='Layer panel mode'>
                <button
                    type='button'
                    role='tab'
                    aria-selected={insertionMode === 'tree'}
                    className={insertionMode === 'tree' ? 'active' : undefined}
                    onClick={() => this.setActiveLayersPanelMode('tree')}
                >
                    <span className={codicon('list-tree')} aria-hidden='true' /> Árvore de camadas
                </button>
                <button
                    type='button'
                    role='tab'
                    aria-selected={insertionMode === 'quickInsert'}
                    className={insertionMode === 'quickInsert' ? 'active' : undefined}
                    onClick={() => this.setActiveLayersPanelMode('quickInsert')}
                >
                    <span className={codicon('add')} aria-hidden='true' /> Inserir rápido
                </button>
            </div>
            {this.renderVisualSelectionToolbar()}
            <div className='builder-layer-context'>
                <strong>Camada ativa</strong>
                <span>{selectedLocation ? this.formatNodePath(selectedLocation.path, selectedLocation.node) : 'Raiz'}</span>
            </div>
                {insertionMode === 'quickInsert' ? <>
                    <p className='builder-panel-note'>
                        Inserindo filhos em <strong>{layersTargetLabel}</strong>. Feche para voltar na árvore completa.
                    </p>
                    {insertionTarget && this.renderLayerQuickInsert(insertionTarget, {
                        title: 'Inserir filho',
                        maxItems: 8
                    })}
                </> : <>
                    <section className='builder-layers-toolbar-sub'>
                        {selectedLocation && <button
                            type='button'
                            onClick={() => this.setActiveLayersPanelMode('quickInsert')}
                            title='Abrir painel de inserção rápida'
                        >
                            <span className={codicon('add')} aria-hidden='true' /> Inserir filho aqui
                        </button>}
                    </section>
                    {this.renderNodeTree(document.tree)}
                </>}
        </div>;
    }

    protected renderLayerQuickInsert(node: BuilderNode, options: { title?: string; maxItems?: number } = {}): React.ReactNode {
        const quickInsert = Builder_LAYER_QUICK_INSERT_TYPES
            .filter(type => this.canAddChild(node, type))
            .slice(0, options.maxItems ?? 6);
        if (quickInsert.length === 0) {
            return <div className='builder-panel-note'>Nenhum componente pode ser inserido aqui.</div>;
        }
        return <div className='builder-layer-quick-insert'>
            <span>{options.title ?? 'Inserir filho:'}</span>
            <div>
                {quickInsert.map(type => {
                        const child = this.registry.get(type);
                        return <button
                            key={type}
                            type='button'
                            title={`Adicionar ${child?.displayName ?? type}`}
                            onClick={() => this.openInsertPanel(node.id, type)}
                        >
                            + {child?.displayName ?? type}
                        </button>;
                    })}
            </div>
        </div>;
    }

    protected renderInsertComponentToolboxCategory(category: BuilderComponentCategory, definitions: BuilderComponentDefinition[]): React.ReactNode {
        return this.renderComponentToolboxCategory(category, definitions, type => this.addNodeToInsertTarget(type));
    }

    protected renderBlocksPanel(): React.ReactNode {
        return <div className='builder-blocks'>
            {BUILDER_BLOCK_TEMPLATES.map(template => <article className='builder-block-template' key={template.id}>
                <div>
                    <span className={codicon(template.icon)} aria-hidden='true' />
                    <div>
                        <h4>{template.title}</h4>
                        <p>{template.description}</p>
                    </div>
                </div>
                <span>{template.category}</span>
                <button type='button' onClick={() => this.addBlockTemplate(template)}>Insert</button>
            </article>)}
        </div>;
    }

    protected renderComponentToolbox(): React.ReactNode {
        const definitions = this.registry.list();
        const query = this.componentSearchQuery.trim().toLowerCase();
        const matches = query
            ? definitions.filter(definition => this.matchesComponentSearch(definition, query))
            : definitions;

        if (definitions.length === 0) {
            return <div className='builder-toolbox-empty' role='status'>
                No components are available in the active Builder registry.
            </div>;
        }

        return <div className='builder-toolbox' aria-label='Builder component toolbox'>
            <label className='builder-toolbox-search'>
                <span className={codicon('search')} aria-hidden='true' />
                <input
                    type='search'
                    value={this.componentSearchQuery}
                    placeholder='Search components'
                    aria-label='Search Builder components'
                    onChange={event => {
                        this.componentSearchQuery = event.currentTarget.value;
                        this.update();
                    }}
                />
                {this.componentSearchQuery && <button
                    type='button'
                    className='builder-toolbox-clear'
                    title='Clear component search'
                    aria-label='Clear component search'
                    onClick={() => {
                        this.componentSearchQuery = '';
                        this.update();
                    }}
                >
                    <span className={codicon('close')} aria-hidden='true' />
                </button>}
            </label>
            {matches.length === 0
                ? <div className='builder-toolbox-empty' role='status'>
                    No components match "{this.componentSearchQuery.trim()}".
                </div>
                : Builder_COMPONENT_CATEGORIES.map(category => this.renderComponentToolboxCategory(category, matches))}
        </div>;
    }

    protected renderComponentToolboxCategory(
        category: BuilderComponentCategory,
        definitions: BuilderComponentDefinition[],
        onSelect: (type: string) => void = type => this.addDefaultChild(type)
    ): React.ReactNode {
        const categoryDefinitions = definitions.filter(definition => definition.category === category);
        if (categoryDefinitions.length === 0) {
            return undefined;
        }

        return <section className='builder-toolbox-category' key={category} aria-label={`${category} components`}>
            <h4>
                <span className={codicon(Builder_COMPONENT_CATEGORY_ICONS[category])} aria-hidden='true' />
                <span>{category}</span>
                <small>{categoryDefinitions.length}</small>
            </h4>
            <div className='builder-toolbox-items'>
                {categoryDefinitions.map(definition => this.renderComponentToolboxItem(definition, onSelect))}
            </div>
        </section>;
    }

    protected renderComponentToolboxItem(definition: BuilderComponentDefinition, onSelect: (type: string) => void): React.ReactNode {
        const icon = Builder_COMPONENT_TYPE_ICONS[definition.type] ?? Builder_COMPONENT_CATEGORY_ICONS[definition.category];
        return <button
            key={definition.type}
            type='button'
            draggable={onSelect === undefined ? false : true}
            title={definition.description ?? definition.displayName}
            onDragStart={event => this.startComponentDrag(event, definition.type)}
            onClick={() => onSelect(definition.type)}
        >
            <span className={`builder-toolbox-icon ${codicon(icon)}`} aria-hidden='true' />
            <span className='builder-toolbox-label'>{definition.displayName}</span>
        </button>;
    }

    protected matchesComponentSearch(definition: BuilderComponentDefinition, query: string): boolean {
        return [
            definition.type,
            definition.displayName,
            definition.category,
            definition.description
        ].some(value => value?.toLowerCase().includes(query));
    }

    protected renderVisualSelectionToolbar(): React.ReactNode {
        const { document, selectedNodeId } = this.editorState.snapshot;
        const selectedLocation = document && selectedNodeId ? findNodeById(document.tree, selectedNodeId) : undefined;
        const isRoot = selectedNodeId === document?.tree.id;
        const canMoveUp = !!selectedLocation?.container && selectedLocation.index !== undefined && selectedLocation.index > 0;
        const canMoveDown = !!selectedLocation?.container
            && selectedLocation.index !== undefined
            && selectedLocation.index < selectedLocation.container.length - 1;

        return <div className='builder-tree-toolbar' aria-label='Selected component actions'>
            <span className='builder-tree-toolbar-label'>Nó selecionado</span>
            <button type='button' title='Move selected component up' disabled={isRoot || !canMoveUp} onClick={() => this.moveSelectedNode(-1)}>
                <span className={codicon('arrow-up')} aria-hidden='true' /> Up
            </button>
            <button type='button' title='Move selected component down' disabled={isRoot || !canMoveDown} onClick={() => this.moveSelectedNode(1)}>
                <span className={codicon('arrow-down')} aria-hidden='true' /> Down
            </button>
            <button type='button' title='Duplicate selected component' disabled={isRoot} onClick={() => this.duplicateSelectedNode()}>
                <span className={codicon('copy')} aria-hidden='true' /> Duplicate
            </button>
            <button type='button' title='Delete selected component' disabled={isRoot} onClick={() => this.removeSelectedNode()}>
                <span className={codicon('trash')} aria-hidden='true' /> Delete
            </button>
        </div>;
    }

    protected renderNodeTree(node: BuilderNode, parentId?: string, slotName?: string, index?: number): React.ReactNode {
        const isRoot = !parentId;
        const selected = node.id === this.editorState.snapshot.selectedNodeId;
        const icon = Builder_COMPONENT_TYPE_ICONS[node.type] ?? 'symbol-misc';
        const layerLabel = this.getNodeLayerLabel(node);
        return <div className='builder-tree-node' key={node.id}>
            <div className={`builder-tree-row${selected ? ' selected' : ''}`}>
                <button
                    type='button'
                    className='builder-tree-select'
                    draggable={!isRoot}
                    onDragStart={event => this.startNodeDrag(event, node.id)}
                    onClick={() => this.selectNode(node.id)}
                    onDragOver={event => {
                        if (parentId) {
                            this.handleComponentDragOver(event, parentId, slotName);
                        }
                    }}
                    onDrop={event => {
                        if (parentId) {
                            this.handleComponentDrop(event, parentId, slotName, index);
                        }
                    }}
                >
                    <span className={`builder-tree-icon ${codicon(icon)}`} aria-hidden='true' />
                    <span className='builder-tree-name'>{layerLabel}</span>
                    <code>{node.type}</code>
                </button>
                {selected && <input
                    className='builder-tree-rename'
                    aria-label={`Rename ${node.type} layer`}
                    title='Layer name'
                    value={node.meta?.label ?? ''}
                    placeholder={node.type}
                    onClick={event => event.stopPropagation()}
                    onChange={event => this.renameSelectedNode(event.currentTarget.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />}
                {slotName && <span className='builder-tree-slot-label'>{slotName}</span>}
                <div className='builder-tree-row-actions'>
                    <button type='button' title='Move up' onClick={() => {
                        this.selectNode(node.id);
                        this.moveSelectedNode(-1);
                    }}>
                        <span className={codicon('arrow-up')} aria-hidden='true' />
                    </button>
                    <button type='button' title='Move down' onClick={() => {
                        this.selectNode(node.id);
                        this.moveSelectedNode(1);
                    }}>
                        <span className={codicon('arrow-down')} aria-hidden='true' />
                    </button>
                    <button type='button' title='Duplicate' onClick={() => {
                        this.selectNode(node.id);
                        this.duplicateSelectedNode();
                    }}>
                        <span className={codicon('copy')} aria-hidden='true' />
                    </button>
                    <button type='button' title='Delete' onClick={() => {
                        this.selectNode(node.id);
                        this.removeSelectedNode();
                    }}>
                        <span className={codicon('trash')} aria-hidden='true' />
                    </button>
                    {!isRoot && <button type='button' title='Add child' onClick={() => this.openInsertPanel(node.id)}>
                        <span className={codicon('add')} aria-hidden='true' />
                    </button>}
                </div>
            </div>
            <div
                className='builder-tree-children'
                onDragOver={event => this.handleComponentDragOver(event, node.id)}
                onDrop={event => this.handleComponentDrop(event, node.id)}
            >
                {node.children?.map((child, childIndex) => this.renderNodeTree(child, node.id, undefined, childIndex))}
            </div>
            {Object.entries(node.slots ?? {}).map(([slot, nodes]) =>
                <div
                    className='builder-tree-slot'
                    key={slot}
                    onDragOver={event => this.handleComponentDragOver(event, node.id, slot)}
                    onDrop={event => this.handleComponentDrop(event, node.id, slot)}
                >
                    <span>{slot}</span>
                    {nodes.map((child, childIndex) => this.renderNodeTree(child, node.id, slot, childIndex))}
                </div>
            )}
        </div>;
    }

    protected getNodeLayerLabel(node: BuilderNode): string {
        if (node.meta?.label) {
            return node.meta.label;
        }
        const textProp = node.props?.children;
        if (typeof textProp === 'string' && textProp.trim()) {
            return textProp.trim().slice(0, 48);
        }
        const titleProp = node.props?.title;
        if (typeof titleProp === 'string' && titleProp.trim()) {
            return titleProp.trim().slice(0, 48);
        }
        return node.type;
    }

    protected formatNodePath(path: BuilderNodePathSegment[], node: BuilderNode): string {
        if (path.length === 0) {
            return node.type;
        }
        return path
            .map((segment, index) => {
                if (segment.kind === 'root') {
                    return 'Page';
                }
                if (segment.kind === 'slot') {
                    return `.${segment.slotName}[${segment.index}]`;
                }
                return `.${segment.kind}[${segment.index}]`;
            })
            .join('')
            .replace(/^\./, '');
    }

    protected pickSuggestedChildType(parent: BuilderNode): string {
        const definition = this.registry.get(parent.type);
        const candidates = definition?.allowedChildren;
        const ordered = candidates && candidates.length > 0
            ? candidates
            : ['Text', 'Button', 'Container', 'Card', 'Image', 'Section', 'Title'];
        return ordered.find(type => this.canAddChild(parent, type)) ?? ordered[0] ?? 'Text';
    }

    protected renderPreview(options: { selectable?: boolean } = {}): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const { document, selectedNodeId } = snapshot;
        const selectable = options.selectable !== false;
        if (this.loadStatus === 'loading') {
            return <BuilderStatusView kind='loading' title='Loading Builder document' message='Reading the canonical .cvpage.json file.' />;
        }
        if (!document) {
            if (!snapshot.json.trim()) {
                return <BuilderStatusView
                    kind='empty'
                    title='Empty Builder document'
                    message='This file does not contain a Builder Schema yet. Create or paste a valid document in the JSON editor, then apply it.'
                />;
            }
            if (snapshot.parseError) {
                return <BuilderStatusView
                    kind='error'
                    title='Invalid JSON'
                    message='The preview is paused until the JSON draft parses and validates.'
                    details={<pre>{snapshot.parseError}</pre>}
                />;
            }
            return <BuilderStatusView
                kind='error'
                title='Invalid Builder document'
                message='The preview is using no canonical document because the current file has validation errors.'
            />;
        }
        if (snapshot.parseError) {
            return <BuilderStatusView
                kind='warning'
                title='JSON draft is invalid'
                message='The preview below still uses the last valid Builder document.'
                details={<pre>{snapshot.parseError}</pre>}
            />;
        }
        return <div className='builder-preview-surface'>
            {renderBuilderDocument({
                document,
                selectedNodeId: selectable ? selectedNodeId : undefined,
                onSelectNode: selectable ? nodeId => this.selectNode(nodeId) : undefined,
                onAction: actionId => this.messages.info(`Builder action requested: ${actionId}`),
                renderUnknownComponent: fallback => this.renderUnknownComponentFallback(fallback.node, fallback.reason)
            }, {
                registry: this.registry,
                components: Builder_MANTINE_COMPONENTS,
                MantineProvider: Builder_MANTINE_PROVIDER
            })}
        </div>;
    }

    protected renderUnknownComponentFallback(node: BuilderNode, reason: string): React.ReactNode {
        return <div className='builder-unknown-component' data-builder-node-id={node.id}>
            <strong>Unknown component</strong>
            <span>{node.type}</span>
            <p>{reason}</p>
        </div>;
    }

    protected renderProperties(options: { showSchemaModel?: boolean; tab?: BuilderPropertiesTab } = {}): React.ReactNode {
        const node = this.selectedNode();
        if (!node) {
            return <div className='builder-panel-note'>Select a layer or preview component to edit properties.</div>;
        }
        const definition = this.registry.get(node.type);
        if (!definition) {
            return <BuilderStatusView
                kind='warning'
                title='Unknown component'
                message={`The selected node uses component type '${node.type}', which is not registered in the active Builder registry.`}
                details={<dl>
                    <dt>Node</dt>
                    <dd>{node.id}</dd>
                    <dt>Type</dt>
                    <dd>{node.type}</dd>
                </dl>}
            />;
        }
        const model = createPropertyPanelModel(node, definition);
        const snapshot = this.editorState.snapshot;
        const tab = options.tab ?? (options.showSchemaModel ? 'advanced' : this.activePropertiesTab);
        const propertyErrors = [
            ...this.rjsfPropertyErrors,
            ...(snapshot.propsError ? snapshot.propsError.split('\n') : []),
            ...this.collectSelectedNodePropsSchemaIssues(node)
                .map(issue => formatValidationMessage(issue))
        ];

        if (tab === 'style') {
            return <>
                {this.renderPropertiesHeader(definition, model, node)}
                {this.renderSelectedNodeStyleEditor(node)}
            </>;
        }

        if (tab === 'data') {
            return <>
                {this.renderPropertiesHeader(definition, model, node)}
                {this.renderSelectedNodeDataPanel(node)}
            </>;
        }

        return <>
            {this.renderPropertiesHeader(definition, model, node)}
            <BuilderPropertyPanel
                node={node}
                definition={definition}
                formComponent={BuilderRjsfPropertyForm}
                validator={rjsfValidator}
                liveValidate={true}
                onValidationError={(errors: string[]) => {
                    this.rjsfPropertyErrors = errors;
                    this.update();
                }}
                onChange={props => this.updateSelectedProps(props as Record<string, BuilderJsonValue>)}
                onSubmit={props => this.updateSelectedProps(props as Record<string, BuilderJsonValue>)}
            />
            {propertyErrors.length > 0 && <section className='builder-validation' role='alert' aria-live='assertive'>
                <h3>Property validation</h3>
                <div className='builder-validation-list'>
                    {propertyErrors.map((message, index) =>
                        <article className='builder-validation-issue' key={`${message}-${index}`}>
                            <div><strong>Error</strong><span>{message}</span></div>
                        </article>
                    )}
                </div>
            </section>}
            {tab === 'advanced' && <>
                <label className='builder-label' htmlFor='builder-props-json'>Props JSON</label>
                <textarea
                    id='builder-props-json'
                    className='builder-props-editor builder-props-json'
                    aria-label='Selected component props JSON'
                    aria-invalid={!!snapshot.propsError || propertyErrors.length > 0}
                    spellCheck={false}
                    value={snapshot.propsDraft}
                    onChange={event => {
                        this.editorState.setPropsDraft(event.currentTarget.value);
                        this.update();
                    }}
                />
                <button type='button' onClick={() => {
                    const nextSnapshot = this.editorState.applyPropsDraft();
                    if (!nextSnapshot.propsError) {
                        this.rjsfPropertyErrors = [];
                    }
                    this.setDirty(nextSnapshot.dirty);
                    this.update();
                }}>Apply Properties</button>
                <h3>RJSF Model</h3>
                <pre>{JSON.stringify(model.propsSchema, undefined, 2)}</pre>
            </>}
        </>;
    }

    protected renderPropertiesHeader(
        definition: BuilderComponentDefinition,
        model: ReturnType<typeof createPropertyPanelModel>,
        node: BuilderNode
    ): React.ReactNode {
        return <>
            <div className='builder-properties-header'>
                <div>
                    <h3>Properties</h3>
                    <strong>{definition.displayName}</strong>
                    <code>{model.nodeId}</code>
                </div>
            </div>
            <dl className='builder-properties-meta'>
                <dt>Type</dt>
                <dd>{model.componentType}</dd>
                <dt>Style</dt>
                <dd>{this.countStyleRules(node)} rule(s)</dd>
            </dl>
        </>;
    }

    protected renderSelectedNodeDataPanel(node: BuilderNode): React.ReactNode {
        return <section className='builder-data-panel builder-selected-data-panel'>
            <div className='builder-record-summary'>
                <h3>Node data</h3>
                {node.data
                    ? <pre>{JSON.stringify(node.data, undefined, 2)}</pre>
                    : <p className='builder-panel-note'>No data binding configured for this component.</p>}
            </div>
            <div className='builder-record-summary'>
                <h3>Events</h3>
                {node.events
                    ? <pre>{JSON.stringify(node.events, undefined, 2)}</pre>
                    : <p className='builder-panel-note'>No events configured for this component.</p>}
            </div>
            {this.renderDataActionsPanel()}
        </section>;
    }

    protected renderSelectedNodeStyleEditor(node: BuilderNode): React.ReactNode {
        const css = node.style?.css ?? {};
        const styleFieldGroups = (Builder_PRESET_STYLE_GROUPS.length ? Builder_PRESET_STYLE_GROUPS : Builder_STYLE_FIELD_GROUPS).map(group => ({
            id: group.id,
            title: group.title,
            fields: group.fields
                .map(name => Builder_STYLE_FIELD_DEFINITIONS.get(name))
                .filter((field): field is { property: string; label: string; kind?: 'color' | 'size' | 'text' } => Boolean(field))
        })).filter(group => group.fields.length > 0);
        const knownProperties = new Set([...Builder_STYLE_FIELD_DEFINITIONS.keys()]);
        const extraFields = Object.keys(css).filter(property => !knownProperties.has(property));
        const hasStyle = this.countStyleRules(node) > 0;

        return <section className='builder-style-editor' aria-label='Selected component style'>
            <div className='builder-style-header'>
                <div>
                    <h3>Style</h3>
                    <span>{this.countStyleRules(node)} rule(s)</span>
                </div>
                <button type='button' disabled={!hasStyle} onClick={() => this.resetSelectedStyle()} title='Reset selected layer style'>
                    <span className={codicon('discard')} aria-hidden='true' /> Reset
                </button>
            </div>
            <section className='builder-style-presets'>
                <h4>Presets</h4>
                <div>
                    {Builder_STYLE_PRESETS.map(preset => <button
                        key={preset.id}
                        type='button'
                        title={preset.title}
                        onClick={() => this.applySelectedStylePreset(preset)}
                    >
                        <span className={codicon(preset.icon)} aria-hidden='true' />
                        <span>{preset.title}</span>
                    </button>)}
                </div>
            </section>
            <label className='builder-label'>
                <span>Class name</span>
                <div className='builder-style-field'>
                    <input
                        type='text'
                        value={node.style?.className ?? ''}
                        placeholder='safe-css-class'
                        onChange={event => this.updateSelectedClassName(event.currentTarget.value)}
                    />
                    {node.style?.className && <button
                        type='button'
                        className='builder-style-clear'
                        title='Clear class name'
                        aria-label='Clear class name'
                        onClick={() => this.updateSelectedClassName('')}
                    >
                        <span className={codicon('close')} aria-hidden='true' />
                    </button>}
                </div>
            </label>
            {styleFieldGroups.map(group => <section className='builder-style-group' key={group.id}>
                <h4>{group.title}</h4>
                <div className='builder-style-grid'>
                    {group.fields.map(field => this.renderStyleFieldInput(field, css))}
                </div>
            </section>)}
            {extraFields.length > 0 &&
                <section className='builder-style-group'>
                    <h4>Outros</h4>
                    <div className='builder-style-grid'>
                        {extraFields.map(property => this.renderStyleFieldInput({
                            property,
                            label: property,
                            kind: isColorLikeProperty(property, '') ? 'color' : undefined
                        }, css))}
                    </div>
                </section>}
            <section className='builder-style-group'>
                <h4>Propriedade personalizada</h4>
                <div className='builder-style-grid builder-style-custom-grid'>
                    <label className='builder-label'>
                        <span>Propriedade</span>
                        <input
                            type='text'
                            placeholder='ex: borderLeft'
                            value={this.newStylePropertyKey}
                            onChange={event => {
                                this.newStylePropertyKey = event.currentTarget.value;
                                this.update();
                            }}
                        />
                    </label>
                    <label className='builder-label'>
                        <span>Valor</span>
                        <input
                            type='text'
                            placeholder='ex: 1px solid #e2e8f0'
                            value={this.newStylePropertyValue}
                            onChange={event => {
                                this.newStylePropertyValue = event.currentTarget.value;
                                this.update();
                            }}
                        />
                    </label>
                    <button
                        type='button'
                        className='builder-style-action'
                        disabled={!this.newStylePropertyKey.trim() || !this.newStylePropertyValue.trim()}
                        onClick={() => this.addStyleProperty()}
                    >
                        Adicionar propriedade
                    </button>
                </div>
            </section>
        </section>;
    }

    protected addStyleProperty(): void {
        const key = this.newStylePropertyKey.trim();
        if (!key) {
            this.messages.warn('Informe a propriedade de estilo.');
            return;
        }
        const value = this.newStylePropertyValue.trim();
        if (!value) {
            this.messages.warn('Informe o valor da propriedade de estilo.');
            return;
        }

        const { document, selectedNodeId } = this.editorState.snapshot;
        if (!document || !selectedNodeId) {
            return;
        }
        const currentNode = findNodeById(document.tree, selectedNodeId)?.node;
        if (!currentNode) {
            return;
        }
        const exists = currentNode.style?.css ? Object.prototype.hasOwnProperty.call(currentNode.style.css, key) : false;
        if (exists) {
            this.messages.info(`A propriedade '${key}' já existe. O valor será sobrescrito.`);
        }
        this.newStylePropertyKey = '';
        this.newStylePropertyValue = '';
        this.updateSelectedStyle(undefined, {
            [key]: value
        });
    }

    protected renderStyleFieldInput(
        field: { property: string; label: string; kind?: 'color' | 'size' | 'text' },
        css: Record<string, BuilderJsonValue>
    ): React.ReactNode {
        const isColor = Builder_STYLE_COLOR_FIELDS.has(field.property);
        const kind = field.kind ?? (isColor || isColorLikeProperty(field.property, field.label) ? 'color' : undefined);
        const value = css[field.property];
        const valueAsString = value === undefined ? '' : String(value);
        return <label className='builder-label' key={field.property}>
            <span>{field.label}</span>
            <div className={`builder-style-field${kind === 'color' ? ' builder-style-field--color' : ''}`}>
                <input
                    type='text'
                    value={valueAsString}
                    placeholder={kind === 'size' ? '16px, md, 100%' : undefined}
                    onChange={event => this.updateSelectedStyleCss(field.property, event.currentTarget.value)}
                />
                {kind === 'color' && <input
                    type='color'
                    aria-label={`${field.label} picker`}
                    value={toHtmlColorValue(valueAsString)}
                    onChange={event => this.updateSelectedStyleCss(field.property, event.currentTarget.value)}
                />}
                {valueAsString && <button
                    type='button'
                    className='builder-style-clear'
                    title={`Clear ${field.label}`}
                    aria-label={`Clear ${field.label}`}
                    onClick={() => this.clearSelectedStyleCss(field.property)}
                >
                    <span className={codicon('close')} aria-hidden='true' />
                </button>}
            </div>
            {kind === 'color' && <div className='builder-color-swatches'>
                {Builder_STYLE_COLOR_SWATCHES.map(color => <button
                    key={`${field.property}-${color}`}
                    type='button'
                    title={color}
                    aria-label={`Use ${color}`}
                    style={{ background: color }}
                    onClick={() => this.updateSelectedStyleCss(field.property, color)}
                />)}
            </div>}
        </label>;
    }

    protected renderThemePanel(): React.ReactNode {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return <BuilderStatusView kind='empty' title='No document loaded' message='Theme editing is available after a valid Builder document is loaded.' />;
        }
        const theme = document.theme ?? {};
        const spacing = theme.spacing ?? {};
        return <section className='builder-theme-panel'>
            <div className='builder-theme-actions'>
                <button
                    type='button'
                    onClick={() => this.resetDocumentTheme()}
                >
                    Restaurar tema padrão
                </button>
            </div>
            <section className='builder-theme-presets'>
                <h3>Presets</h3>
                <div>
                    {Builder_THEME_PRESETS.map(preset => {
                        const tokens = preset.patch.tokens ?? {};
                        const swatches = ['surface', 'heroSurface', 'brandAccent']
                            .map(token => tokens[token])
                            .filter((value): value is string => typeof value === 'string');
                        return <button
                            key={preset.id}
                            type='button'
                            title={preset.title}
                            onClick={() => this.applyThemePreset(preset)}
                        >
                            <span className={codicon(preset.icon)} aria-hidden='true' />
                            <strong>{preset.title}</strong>
                            <span className='builder-theme-preset-swatches'>
                                {swatches.map(color => <span key={`${preset.id}-${color}`} style={{ background: color }} />)}
                            </span>
                        </button>;
                    })}
                </div>
            </section>
            <section className='builder-theme-section'>
                <h3>Base</h3>
                <label className='builder-label'>
                    <span>Mode</span>
                    <select value={theme.mode ?? 'light'} onChange={event => this.updateDocumentTheme({ mode: event.currentTarget.value as BuilderTheme['mode'] })}>
                        <option value='light'>Light</option>
                        <option value='dark'>Dark</option>
                        <option value='auto'>Auto</option>
                    </select>
                </label>
                <label className='builder-label'>
                    <span>Primary color</span>
                    <div className='builder-style-field builder-style-field--color'>
                        <input
                            type='text'
                            value={theme.primaryColor ?? ''}
                            placeholder='blue or #2563eb'
                            onChange={event => this.updateDocumentTheme({ primaryColor: event.currentTarget.value.trim() || undefined })}
                        />
                        <input
                            type='color'
                            aria-label='Primary color picker'
                            value={toHtmlColorValue(theme.primaryColor ?? '')}
                            onChange={event => this.updateDocumentTheme({ primaryColor: event.currentTarget.value })}
                        />
                    </div>
                    <div className='builder-color-swatches'>
                    {Builder_THEME_COLOR_SWATCHES.map(color => <button
                        key={color}
                            type='button'
                            title={color}
                            aria-label={`Use ${color}`}
                            style={{ background: color }}
                            onClick={() => this.updateDocumentTheme({ primaryColor: color })}
                        />)}
                    </div>
                </label>
                <label className='builder-label'>
                    <span>Radius</span>
                    <select value={theme.radius ?? 'md'} onChange={event => this.updateDocumentTheme({ radius: event.currentTarget.value })}>
                        {['none', 'xs', 'sm', 'md', 'lg', 'xl'].map(radius => <option key={radius} value={radius}>{radius}</option>)}
                    </select>
                </label>
                <label className='builder-label'>
                    <span>Font family</span>
                    <input
                        type='text'
                        value={theme.fontFamily ?? ''}
                        placeholder='Inter, system-ui, sans-serif'
                        onChange={event => this.updateDocumentTheme({ fontFamily: event.currentTarget.value.trim() || undefined })}
                    />
                </label>
            </section>
            <section className='builder-theme-section builder-theme-spacing'>
                <h3>Spacing</h3>
                {['xs', 'sm', 'md', 'lg', 'xl'].map(size => <label className='builder-label' key={size}>
                    <span>{size}</span>
                    <input
                        type='text'
                        value={spacing[size] === undefined ? '' : String(spacing[size])}
                        placeholder='4, 8px, 1rem'
                        onChange={event => this.updateDocumentThemeSpacing(size, event.currentTarget.value)}
                    />
                </label>)}
            </section>
            <section className='builder-theme-section builder-theme-tokens'>
                <div className='builder-theme-token-header'>
                    <h3>Tokens</h3>
                    <span className='builder-panel-note'>{Object.keys(theme.tokens ?? {}).length} token(s)</span>
                </div>
                <div className='builder-theme-preset-tokens'>
                    {Builder_THEME_PRESET_TOKENS.map(token => <button
                        key={`preset-${token.token}`}
                        type='button'
                        onClick={() => this.applyThemePresetToken(token.token, token.value)}
                        title={`Apply ${token.label} token`}
                    >
                        <span className='builder-theme-token-swatch' style={{ background: token.value }} />
                        <span>{token.label}</span>
                    </button>)}
                </div>
                {Object.entries(theme.tokens ?? {}).map(([tokenName, rawValue]) => {
                    const tokenValue = typeof rawValue === 'string' ? rawValue : '';
                    const isColorToken = Builder_THEME_TOKEN_COLOR_HINTS.includes(tokenName) || isColorLikeProperty(tokenName, undefined);
                    const rowContent = <label className='builder-label'>
                        <span>{tokenName}</span>
                        {isColorToken
                            ? <div className='builder-style-field builder-style-field--color'>
                                <input
                                    type='text'
                                    value={tokenValue}
                                    onChange={event => this.updateThemeToken(tokenName, event.currentTarget.value)}
                                />
                                <input
                                    type='color'
                                    aria-label={`Token ${tokenName} picker`}
                                    value={toHtmlColorValue(tokenValue)}
                                    onChange={event => this.updateThemeToken(tokenName, event.currentTarget.value)}
                                />
                            </div>
                            : <input
                                type='text'
                                value={tokenValue}
                                onChange={event => this.updateThemeToken(tokenName, event.currentTarget.value)}
                            />}
                        <button type='button' onClick={() => this.removeThemeToken(tokenName)}>Remover</button>
                    </label>;
                    return <article key={`${tokenName}-theme-token`}>{rowContent}</article>;
                })}
                <label className='builder-label'>
                    <span>Adicionar token</span>
                    <input
                        type='text'
                        value={this.newThemeTokenKey}
                        placeholder='token'
                        onChange={event => {
                            this.newThemeTokenKey = event.currentTarget.value;
                            this.update();
                        }}
                    />
                </label>
                <label className='builder-label'>
                    <span>Valor do token</span>
                    <input
                        type='text'
                        value={this.newThemeTokenValue}
                        placeholder='valor'
                        onChange={event => {
                            this.newThemeTokenValue = event.currentTarget.value;
                            this.update();
                        }}
                    />
                </label>
                <button type='button' onClick={() => this.addThemeToken()}>Adicionar</button>
            </section>
        </section>;
    }

    protected renderDataActionsPanel(): React.ReactNode {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return <BuilderStatusView kind='empty' title='No document loaded' message='Data, actions and states are available after a valid Builder document is loaded.' />;
        }
        return <div className='builder-data-panel'>
            {this.renderDocumentRecordSummary('Data Sources', document.dataSources ?? {})}
            {this.renderDocumentRecordSummary('Actions', document.actions ?? {})}
            {this.renderDocumentRecordSummary('States', document.states ?? {})}
            {this.renderDocumentRecordSummary('Permissions', document.permissions ?? {})}
        </div>;
    }

    protected renderDocumentRecordSummary(title: string, record: Record<string, unknown>): React.ReactNode {
        const entries = Object.entries(record);
        return <section className='builder-record-summary'>
            <h3>{title}</h3>
            {entries.length === 0
                ? <p className='builder-panel-note'>No entries.</p>
                : entries.map(([id, value]) => {
                    const details = isSchemaObject(value) ? value : {};
                    const type = readStringFromRecord(details, 'type') ?? readStringFromRecord(details, 'effect') ?? 'custom';
                    return <article key={id}>
                        <strong>{id}</strong>
                        <code>{type}</code>
                    </article>;
                })}
        </section>;
    }

    protected renderAi(): React.ReactNode {
        const canAccept = !!this.aiPendingPatch && !!this.aiPendingPreview && !this.aiPatchError;
        const waitingForAi = this.aiStatus === 'loading';
        return <>
            <h3>AI Patch Generator</h3>
            {this.editorState.snapshot.selectedNode
                ? <p className='builder-panel-note'>
                    Selected component: {this.editorState.snapshot.selectedNode.type} ({this.editorState.snapshot.selectedNode.id})
                </p>
                : <p className='builder-panel-note'>Select a component before asking AI for a component change.</p>}
            <textarea
                aria-label='AI patch prompt'
                className='builder-ai-prompt'
                value={this.aiPrompt}
                onChange={event => {
                    this.aiPrompt = event.currentTarget.value;
                    this.update();
                }}
                placeholder='Describe a page or change. The AI layer returns structured Builder operations.'
            />
            <button type='button' onClick={() => this.generateAiPatch()} disabled={waitingForAi}>
                {waitingForAi ? 'Waiting for AI...' : 'Generate Patch'}
            </button>
            {waitingForAi && <BuilderStatusView kind='loading' title='AI waiting for response' message='The AI layer is generating structured Builder operations.' />}
            {this.aiStatus === 'error' && this.aiPatchError && <BuilderStatusView kind='error' title='AI patch failed validation' message={this.aiPatchError} />}
            {this.aiPatchPreview && <>
                <h3>Preview</h3>
                <div className='builder-ai-decision-bar'>
                    <button type='button' onClick={() => this.acceptAiPatch()} disabled={!canAccept}>Aceitar</button>
                    <button type='button' onClick={() => this.rejectAiPatch()}>Rejeitar</button>
                </div>
                {this.aiPatchError && <p className='builder-error' role='alert'>{this.aiPatchError}</p>}
                {this.aiPendingPreview && <>
                    <p className='builder-panel-note'>
                        {this.aiPendingPreview.requiresAcceptance ? 'Esta alteracao exige aceite antes de aplicar.' : 'Operacoes validadas e prontas para aplicar.'}
                    </p>
                    {this.renderAiDiff(this.aiPendingPreview.diff)}
                    {this.renderAiDocumentPreview(this.aiPendingPreview.document)}
                </>}
                <pre>{this.aiPatchPreview}</pre>
            </>}
        </>;
    }

    protected renderAiDocumentPreview(document: BuilderDocument): React.ReactNode {
        return <section className='builder-ai-rendered-preview'>
            <h3>Preview renderizado</h3>
            <div className='builder-preview-surface'>
                {renderBuilderDocument({
                    document,
                    onAction: actionId => this.messages.info(`Builder action requested in AI preview: ${actionId}`)
                }, {
                    registry: this.registry,
                    components: Builder_MANTINE_COMPONENTS,
                    MantineProvider: Builder_MANTINE_PROVIDER
                })}
            </div>
        </section>;
    }

    protected renderAiDiff(diff: BuilderAiStructuralDiffEntry[]): React.ReactNode {
        if (diff.length === 0) {
            return <p className='builder-panel-note'>No document changes detected.</p>;
        }
        return <section className='builder-ai-diff'>
            <h3>Diff</h3>
            <div className='builder-validation-list'>
                {diff.slice(0, 25).map((entry, index) =>
                    <article className='builder-validation-issue' key={`${entry.path}-${index}`}>
                        <div><strong>{entry.kind}</strong><span>{entry.path}</span></div>
                    </article>
                )}
            </div>
            {diff.length > 25 && <p className='builder-panel-note'>Showing 25 of {diff.length} diff entries.</p>}
        </section>;
    }

    protected renderExport(): React.ReactNode {
        const snapshot = this.editorState.snapshot;
        const hasCurrentJsonErrors = !!snapshot.parseError || snapshot.validationIssues.length > 0;
        const isExporting = this.exportPhase === 'loading';
        const cannotExport = hasCurrentJsonErrors || snapshot.hasUnappliedJsonChanges || isExporting;
        return <>
            <h3>HTML Export</h3>
            <p className='builder-panel-note'>Exports the current Builder document as static HTML files.</p>
            <button type='button' disabled={cannotExport} onClick={() => this.exportHtml()}>
                {isExporting ? 'Exporting...' : 'Export HTML'}
            </button>
            {isExporting && <BuilderStatusView kind='loading' title='Exporting HTML' message='Generating index.html and styles.css from the current Builder document.' />}
            {this.exportPhase === 'success' && this.exportStatus && <BuilderStatusView kind='success' title='Export completed' message={this.exportStatus} />}
            {this.exportPhase === 'error' && this.exportError && <BuilderStatusView kind='error' title='Export failed' message={this.exportError} />}
            {this.exportPreview && <section className='builder-export-preview'>
                <div>
                    <h4>Export Preview</h4>
                    <span>{this.exportPreview.uri.path.toString()}</span>
                </div>
                <iframe
                    title='Builder exported HTML preview'
                    sandbox=''
                    srcDoc={this.exportPreview.srcDoc}
                />
            </section>}
        </>;
    }

    protected renderInspector(): React.ReactNode {
        const { document } = this.editorState.snapshot;
        if (!document) {
            return <div className='builder-panel-note'>No valid document loaded.</div>;
        }
        return <>
            <h3>Document</h3>
            <dl>
                <dt>Schema</dt>
                <dd>{document.schemaVersion}</dd>
                <dt>Page</dt>
                <dd>{document.page.title}</dd>
                <dt>Root</dt>
                <dd>{document.tree.type}</dd>
            </dl>
            {this.renderValidationSummary()}
        </>;
    }

    protected renderValidationSummary(): React.ReactNode {
        const { parseError } = this.editorState.snapshot;
        if (parseError) {
            return <section className='builder-validation' role='alert' aria-live='assertive'>
                <h3>Validation</h3>
                <div className='builder-validation-issue'>
                    <div><strong>Error</strong><span>{parseError}</span></div>
                </div>
            </section>;
        }

        const issues = this.collectValidationIssues();
        return <section className='builder-validation' role={issues.length > 0 ? 'alert' : 'status'} aria-live={issues.length > 0 ? 'assertive' : 'polite'}>
            <h3>Validation</h3>
            {issues.length === 0
                ? <p className='builder-ok'>No validation errors.</p>
                : <div className='builder-validation-list'>
                    {issues.map((issue, index) => <article className='builder-validation-issue' key={`${issue.path}-${index}`}>
                        <div><strong>Path</strong><code>{issue.path}</code></div>
                        <div><strong>Error</strong><span>{issue.message}</span></div>
                        <div><strong>Component</strong><span>{issue.componentType ?? '-'}</span></div>
                        <div><strong>nodeId</strong><code>{issue.nodeId ?? '-'}</code></div>
                    </article>)}
                </div>}
        </section>;
    }

    protected collectValidationIssues(): BuilderValidationIssue[] {
        const { document, validationIssues } = this.editorState.snapshot;
        if (validationIssues.length > 0) {
            return validationIssues;
        }
        if (!document) {
            return [];
        }

        const components = validateBuilderDocumentTypesAgainstRegistry(document, this.registry);
        const actions = validateBuilderDocumentActionsAgainstRegistry(document, this.actionRegistry);
        const dataSources = validateBuilderDocumentDataSourcesAgainstRegistry(document, this.dataSourceRegistry);

        return [
            ...validationIssues,
            ...components.errors.map(error => this.fromRegistryIssue(error)),
            ...actions.errors.map(error => this.fromActionIssue(error)),
            ...dataSources.errors.map(error => this.fromDataSourceIssue(error))
        ];
    }

    protected collectSelectedNodePropsSchemaIssues(node: BuilderNode): BuilderValidationIssue[] {
        const propsPath = '.props';
        return this.collectValidationIssues().filter(issue =>
            issue.nodeId === node.id && (issue.path.endsWith(propsPath) || issue.path.includes(`${propsPath}.`))
        );
    }

    protected enrichStructuralIssues(document: BuilderDocument, errors: Array<{ path: string; message: string; nodeId?: string }>): BuilderValidationIssue[] {
        return errors.map(error => ({
            path: error.path,
            message: error.message,
            nodeId: error.nodeId,
            componentType: error.nodeId ? findNodeById(document.tree, error.nodeId)?.node.type : undefined
        }));
    }

    protected validateLoadedDocument(document: BuilderDocument): BuilderValidationIssue[] {
        const components = validateBuilderDocumentTypesAgainstRegistry(document, this.registry);
        const actions = validateBuilderDocumentActionsAgainstRegistry(document, this.actionRegistry);
        const dataSources = validateBuilderDocumentDataSourcesAgainstRegistry(document, this.dataSourceRegistry);

        return [
            ...components.errors.map(error => this.fromRegistryIssue(error)),
            ...actions.errors.map(error => this.fromActionIssue(error)),
            ...dataSources.errors.map(error => this.fromDataSourceIssue(error))
        ];
    }

    protected fromRegistryIssue(error: BuilderValidationError): BuilderValidationIssue {
        return {
            path: error.path,
            message: error.message,
            nodeId: error.nodeId,
            componentType: error.componentType
        };
    }

    protected fromActionIssue(error: BuilderActionRegistryValidationError): BuilderValidationIssue {
        return {
            path: error.path,
            message: error.message,
            subjectId: error.actionId,
            subjectType: error.actionType
        };
    }

    protected fromDataSourceIssue(error: BuilderDataSourceRegistryValidationError): BuilderValidationIssue {
        return {
            path: error.path,
            message: error.message,
            subjectId: error.dataSourceId,
            subjectType: error.dataSourceType
        };
    }
}

// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MAIN_MENU_BAR, MenuPath } from '@theia/core/lib/common';

export const CYBERVINCI_PRODUCT_NAME = 'CyberVinci';
export const CYBERVINCI_DEFAULT_ICON = 'dourado-ciano-e-branco';
export const CYBERVINCI_ICON_PREFERENCE = 'workbench.cyberVinciIcon';
export const CYBERVINCI_ICON_STORAGE_KEY = CYBERVINCI_ICON_PREFERENCE;

export namespace CyberVinciMenus {
    export const CYBERVINCI: MenuPath = [...MAIN_MENU_BAR, '0_cybervinci'];
    export const AI_CHAT: MenuPath = [...CYBERVINCI, '1_ai_chat'];
    export const CODEX: MenuPath = [...CYBERVINCI, '1_5_codex'];
    export const OPENPENCIL: MenuPath = [...CYBERVINCI, '2_openpencil'];
    export const DOCUMENTATION: MenuPath = [...CYBERVINCI, '3_documentation'];
    export const MEMORY: MenuPath = [...CYBERVINCI, '4_memory'];
    export const ARENA: MenuPath = [...CYBERVINCI, '5_arena'];
    export const FLOW: MenuPath = [...CYBERVINCI, '6_flow'];
    export const BUILDER: MenuPath = [...CYBERVINCI, '7_builder'];
}

export const CYBERVINCI_MENU_ITEMS = {
    AI_CHAT: {
        label: 'AI Chat',
        icon: 'message-circle',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-message-circle'
    },
    CODEX: {
        label: 'Codex',
        icon: 'codex',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-codex'
    },
    OPENPENCIL: {
        label: 'Canvas',
        icon: 'paintbrush',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-paintbrush'
    },
    DOCUMENTATION: {
        label: 'Library',
        icon: 'book-open',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-book-open'
    },
    MEMORY: {
        label: 'Memory',
        icon: 'brain',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-brain'
    },
    ARENA: {
        label: 'Arena',
        icon: 'swords',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-swords'
    },
    FLOW: {
        label: 'Flow',
        icon: 'workflow',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-workflow'
    },
    BUILDER: {
        label: 'Builder',
        icon: 'brick-wall',
        iconClass: 'cybervinci-product-icon cybervinci-product-icon-brick-wall'
    }
} as const;

export const cybervinciCanvasProductLabel = CYBERVINCI_MENU_ITEMS.OPENPENCIL.label;

export const cybervinciCanvasCommandLabel = (action: string): string =>
    `${cybervinciCanvasProductLabel}: ${action}`;

export namespace CyberVinciCommandIds {
    export const OPEN_CHAT = 'ai-chat-ui.new-chat';
    export const ARENA_NEW_DUEL = 'arena.newDuel';
    export const DOCUMENTATION_MANAGER = 'library.open-manager';
    export const FLOW_OPEN = 'flow.open';
}

export interface CyberVinciProductFeature {
    readonly id: string;
    readonly label: string;
    readonly packageName: string;
    readonly packagePath: string;
    readonly category: 'branding' | 'feature-extension' | 'optional-extension' | 'provider-extension' | 'host-customization';
    readonly ownerBoundary: 'cybervinci-owned' | 'upstream-adapter' | 'host-app';
    readonly updateRisk: 'low' | 'medium' | 'high';
    readonly requiredInBrowserApp: boolean;
    readonly requiredInElectronApp: boolean;
    readonly notes: readonly string[];
}

export type CyberVinciProductEdition = 'free-core' | 'pro' | 'marketplace-extension' | 'private-extension';

export interface CyberVinciCommercialBoundary {
    readonly id: string;
    readonly edition: CyberVinciProductEdition;
    readonly packageNames: readonly string[];
    readonly owns: readonly string[];
    readonly coreRestrictions: readonly string[];
    readonly installModel: 'host-dependency' | 'marketplace-install' | 'private-distribution';
}

export interface CyberVinciCorePatchBoundary {
    readonly id: string;
    readonly area: string;
    readonly files: readonly string[];
    readonly reason: string;
    readonly risk: 'low' | 'medium' | 'high';
    readonly desiredExit: string;
    readonly verification: readonly string[];
}

export interface CyberVinciRegressionGate {
    readonly id: string;
    readonly command: string;
    readonly coverage: readonly string[];
    readonly requiredBeforeUpgradeMerge: boolean;
}

export const CYBERVINCI_PRODUCT_FEATURES: readonly CyberVinciProductFeature[] = [
    {
        id: 'branding',
        label: 'CyberVinci Product Shell',
        packageName: '@cybervinci/branding',
        packagePath: 'packages/branding',
        category: 'branding',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'low',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Owns shared CyberVinci menu paths, product inventory, upgrade gates, and patch-boundary documentation.']
    },
    {
        id: 'memory',
        label: 'Memory',
        packageName: '@cybervinci/memory',
        packagePath: 'packages/memory',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Local-first code/document graph, memory, context cart, chat suggestions, and workspace indexing.']
    },
    {
        id: 'memory-roslyn',
        label: 'Memory Roslyn',
        packageName: '@cybervinci/memory-roslyn',
        packagePath: 'packages/memory-roslyn',
        category: 'optional-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: false,
        requiredInElectronApp: false,
        notes: ['Optional .NET/Roslyn analyzer sidecar. It must remain optional so Theia/OpenPencil updates do not require .NET.']
    },
    {
        id: 'documentation-manager',
        label: 'Documentation Manager',
        packageName: '@cybervinci/library',
        packagePath: 'packages/library',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Versioned documentation registry, local docs store, FTS/JSON fallback, and AI context tools.']
    },
    {
        id: 'arena',
        label: 'Arena',
        packageName: '@cybervinci/arena',
        packagePath: 'packages/arena',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['A/B/C prompt testing, sandboxed runners, language-model runner, and review artifacts.']
    },
    {
        id: 'flow',
        label: 'Flow',
        packageName: '@cybervinci/flow',
        packagePath: 'packages/flow',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: [
            'Planned removable CyberVinci extension package for visual agency workflows, runs, human gates, artifacts, and workload boards.',
            'Must keep UI and Theia bridge isolated from the portable Go Agency Kernel, which remains executable through CLI/daemon modes outside Theia.',
            'Must use Memory through a small adapter for context packs and memory writes rather than coupling workflow state to Memory internals.',
            'Must remain disableable or removable from the host app package manifests without breaking CyberVinci IDE startup or unrelated product extensions.'
        ]
    },
    {
        id: 'openpencil',
        label: 'Canvas',
        packageName: '@cybervinci/openpencil-extension',
        packagePath: 'packages/openpencil-cybervinci-extension',
        category: 'feature-extension',
        ownerBoundary: 'upstream-adapter',
        updateRisk: 'high',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Vendored OpenPencil runtime, document adapters, AI commands, Figma import, codegen, and local fallback shell.']
    },
    {
        id: 'builder',
        label: 'CyberVinci UI Builder Extension',
        packageName: '@cybervinci/builder',
        packagePath: 'packages/builder',
        category: 'optional-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: false,
        requiredInElectronApp: false,
        notes: [
            'Optional paid/product extension for Builder Schema page creation, WYSIWYG editing, property panels, AI page operations, and HTML export.',
            'Must remain installable and removable without breaking the free CyberVinci core or unrelated product extensions.',
            'Puck, RJSF, builder AI, export packages, premium templates, and premium components must stay behind this optional extension boundary.',
            'Any .builder.json recognition outside this extension must be optional, read-only, or limited to an install-the-extension message.'
        ]
    },
    {
        id: 'ai-ide-product-chat',
        label: 'CyberVinci AI IDE Chat UX',
        packageName: '@theia/ai-ide',
        packagePath: 'packages/ai-ide',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Owns Ask CyberVinci AI welcome provider, specialized agents, product chat UX, and workspace tool providers.']
    },
    {
        id: 'ai-output-cleaner',
        label: 'CyberVinci AI Output Cleaner',
        packageName: '@cybervinci/ai-output-cleaner',
        packagePath: 'packages/ai-output-cleaner',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Owns deterministic AI/tool output filtering, raw artifact capture, Codex wrapper and hook controls, and status commands exposed in the product surface.']
    },
    {
        id: 'ai-providers',
        label: 'CyberVinci AI Providers',
        packageName: '@cybervinci/ai-providers',
        packagePath: 'packages/ai-providers',
        category: 'provider-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Configures provider/runtime adapters for CyberVinci chat, OpenPencil design, Codex CLI, direct HTTP routers, and CLI runtimes.']
    },
    {
        id: 'ai-runtime',
        label: 'CyberVinci AI Runtime',
        packageName: '@cybervinci/ai-runtime',
        packagePath: 'packages/ai-runtime',
        category: 'provider-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Provides the provider-neutral AI task gateway used by feature-specific AI buttons and prompt panels.']
    },
    {
        id: 'codex-sidebar',
        label: 'CyberVinci Codex Sidebar',
        packageName: '@cybervinci/codex',
        packagePath: 'packages/codex',
        category: 'feature-extension',
        ownerBoundary: 'cybervinci-owned',
        updateRisk: 'medium',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Owns the native Codex sidebar panel with thread list, composer, approvals, and Codex Provider app-server streaming for VS Code parity.']
    },
    {
        id: 'welcome-branding',
        label: 'Welcome and Branding Host Customization',
        packageName: '@theia/getting-started',
        packagePath: 'packages/getting-started',
        category: 'host-customization',
        ownerBoundary: 'host-app',
        updateRisk: 'high',
        requiredInBrowserApp: true,
        requiredInElectronApp: true,
        notes: ['Currently hosts the CyberVinci welcome experience and launch links; target state is branding-owned contribution data.']
    }
];

export const CYBERVINCI_COMMERCIAL_BOUNDARIES: readonly CyberVinciCommercialBoundary[] = [
    {
        id: 'cybervinci-free-core',
        edition: 'free-core',
        packageNames: [
            '@cybervinci/branding',
            '@cybervinci/memory',
            '@cybervinci/arena',
            '@cybervinci/openpencil-extension'
        ],
        owns: [
            'CyberVinci shell, branding, required product extensions, and free IDE workflows.'
        ],
        coreRestrictions: [
            'Must not depend on Builder Builder packages, Puck, RJSF, builder AI, premium templates, premium components, HTML/React exporters, visual data binding, or visual action designer.',
            'May expose only optional install hints for .builder.json files when the UI Builder extension is absent.'
        ],
        installModel: 'host-dependency'
    },
    {
        id: 'cybervinci-ui-builder-private',
        edition: 'private-extension',
        packageNames: [
            '@cybervinci/builder',
            '@cybervinci/builder-editor-puck',
            '@cybervinci/builder-property-panel-rjsf',
            '@cybervinci/builder-ai',
            '@cybervinci/builder-export-html',
            '@cybervinci/builder-export-react'
        ],
        owns: [
            'Builder WYSIWYG editor, property panel, builder AI operations, export adapters, premium templates, premium components, visual data binding, and visual action designer.'
        ],
        coreRestrictions: [
            'Must remain installable and removable without moving premium implementation into CyberVinci core.',
            'Must keep all commercial runtime checks, future license handling, marketplace metadata, and entitlement decisions inside the optional extension boundary or its own provider package.'
        ],
        installModel: 'private-distribution'
    },
    {
        id: 'cybervinci-ui-builder-marketplace',
        edition: 'marketplace-extension',
        packageNames: [
            '@cybervinci/builder'
        ],
        owns: [
            'Future marketplace packaging, activation, update, and entitlement integration for the UI Builder product.'
        ],
        coreRestrictions: [
            'Marketplace activation must not require CyberVinci core to import UI Builder source packages.',
            'The free host may discover the extension through package metadata or contribution points, not by linking premium code.'
        ],
        installModel: 'marketplace-install'
    }
];

export const CYBERVINCI_CORE_PATCH_BOUNDARIES: readonly CyberVinciCorePatchBoundary[] = [
    {
        id: 'core-brand-name-about-dialog',
        area: 'Product identity',
        files: [
            'packages/core/src/browser/about-dialog.tsx',
            'packages/core/src/browser/frontend-application-module.ts'
        ],
        reason: 'CyberVinci currently customizes product name and about dialog copy inside core.',
        risk: 'high',
        desiredExit: 'Move product copy and about metadata to branding/application config contribution when the host exposes a stable hook.',
        verification: ['CyberVinci about dialog shows product name and agentic IDE copy after update.']
    },
    {
        id: 'core-icon-preload-and-preferences',
        area: 'Product icon and preload',
        files: [
            'packages/core/src/browser/common-frontend-contribution.ts',
            'packages/core/src/browser/preload/cybervinci-icon-preload-contribution.ts',
            'packages/core/src/common/core-preferences.ts',
            'packages/core/src/browser/icons/cybervinci'
        ],
        reason: 'The selected CyberVinci icon must appear before the frontend fully starts, including splash/preload states.',
        risk: 'high',
        desiredExit: 'Keep only a small preload hook in core or expose preload contributions from product shell; move icon registry data to product shell.',
        verification: ['Selected icon persists across reloads and appears in app shell, welcome, chat, and splash.']
    },
    {
        id: 'app-manager-splash-branding',
        area: 'Generated application shell',
        files: [
            'dev-packages/application-manager/src/generator/frontend-generator.ts',
            'dev-packages/application-manager/src/rebuild.ts',
            'examples/electron/resources/cybervinci-splash.html',
            'examples/electron/resources/cybervinci-icons'
        ],
        reason: 'Browser/electron generated HTML and splash screens need CyberVinci-specific branding before Theia extensions load.',
        risk: 'medium',
        desiredExit: 'Keep this as a documented host-app patch unless Theia app-manager supports branding resource contributions.',
        verification: ['Browser generated HTML and Electron splash use the selected CyberVinci icon without Theia logo fallback.']
    },
    {
        id: 'ai-chat-product-ux',
        area: 'AI chat UX and product wording',
        files: [
            'packages/ai-chat-ui/src/browser/chat-view-widget.tsx',
            'packages/ai-chat-ui/src/browser/chat-tree-view/chat-view-tree-widget.tsx',
            'packages/ai-chat-ui/src/browser/style/index.css',
            'packages/branding/src/browser/style/cybervinci-ai-chat-codex.css',
            'packages/ai-core/src/common/ai-core-preferences.ts',
            'packages/core/i18n/nls.json'
        ],
        reason: 'CyberVinci chat welcome, capability labels, input layout, and provider wording are product-defining UX.',
        risk: 'medium',
        desiredExit: 'Use contribution points for welcome messages and provider capabilities; keep CSS overrides scoped and documented.',
        verification: ['Ask CyberVinci AI input is visible at normal browser height and welcome text/icons are product-branded.']
    },
    {
        id: 'workspace-and-debug-product-copy',
        area: 'Product copy in upstream packages',
        files: [
            'packages/workspace/src/browser/workspace-frontend-contribution.ts',
            'packages/debug/src/browser/debug-session.tsx'
        ],
        reason: 'Small product-copy replacements keep UI labels consistent.',
        risk: 'low',
        desiredExit: 'Prefer applicationName/productName substitution hooks where available; otherwise keep as low-risk copy patch.',
        verification: ['Workspace and debug labels use CyberVinci without changing behavior.']
    }
];

export const CYBERVINCI_REGRESSION_GATES: readonly CyberVinciRegressionGate[] = [
    {
        id: 'branding-contract',
        command: 'npm run test --workspace @cybervinci/branding',
        coverage: ['Product inventory', 'patch matrix', 'host app dependencies', 'upgrade gate manifest'],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'memory-contracts',
        command: 'npm run test --workspace @cybervinci/memory',
        coverage: ['Memory graph, memory, context cart, chat suggestions, and library integration'],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'documentation-manager-contracts',
        command: 'npm run test --workspace @cybervinci/library',
        coverage: ['Documentation registry, install/update/check, search, lockfile, and storage fallback behavior'],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'arena-contracts',
        command: 'npm run test --workspace @cybervinci/arena',
        coverage: ['Arena duel service, runner registry, sandbox lifecycle, and fallback model behavior'],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'flow-contracts',
        command: 'npm run test --workspace @cybervinci/flow',
        coverage: [
            'Flow extension isolation, host bridge protocol, kernel/CLI boundary, Memory adapter, run/workflow storage, and removable-host behavior'
        ],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'openpencil-contracts',
        command: 'npm run test --workspace @cybervinci/openpencil-extension -- --grep "OpenPencil"',
        coverage: ['OpenPencil document, runtime, AI, Figma import, codegen, toolbar, review panel, and browser contracts'],
        requiredBeforeUpgradeMerge: true
    },
    {
        id: 'browser-smoke-product',
        command: 'npm --workspace @theia/playwright run ui-tests -- --grep "OpenPencil browser acceptance|CyberVinci product shell"',
        coverage: ['Browser product shell, welcome, OpenPencil launch path, AI Output Cleaner command surface, save/reopen, and visible branded UI'],
        requiredBeforeUpgradeMerge: true
    }
];


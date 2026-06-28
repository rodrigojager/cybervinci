import { Command } from '@theia/core/lib/common';
import { codicon } from '@theia/core/lib/browser';
import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';

export namespace MemoryCommands {
    export const OPEN: Command = {
        id: 'memory.open',
        label: 'Memory: Open',
        iconClass: CYBERVINCI_MENU_ITEMS.MEMORY.iconClass
    };
    export const OPEN_CODE_GRAPH: Command = {
        id: 'memory.open-code-graph',
        label: 'Memory: Code Graph',
        iconClass: codicon('type-hierarchy')
    };
    export const OPEN_DOCUMENT_GRAPH: Command = {
        id: 'memory.open-document-graph',
        label: 'Memory: Document Graph',
        iconClass: codicon('references')
    };
    export const OPEN_PROJECT_MEMORY_GRAPH: Command = {
        id: 'memory.open-project-memory-graph',
        label: 'Memory: Project Memory Graph',
        iconClass: codicon('database')
    };
    export const OPEN_PREFERENCES_GRAPH: Command = {
        id: 'memory.open-preferences-graph',
        label: 'Memory: IDE Memories Graph',
        iconClass: codicon('settings-gear')
    };
    export const OPEN_SKILLS_REVIEW: Command = {
        id: 'memory.open-skills-review',
        label: 'Memory: Skills Approvals',
        iconClass: codicon('sparkle')
    };
    export const OPEN_SETTINGS: Command = {
        id: 'memory.open-settings',
        label: 'Memory: Settings',
        iconClass: codicon('settings')
    };
    export const OPEN_IMPACT: Command = {
        id: 'memory.open-impact',
        label: 'Memory: Change Impact',
        iconClass: codicon('git-compare')
    };
    export const DETECT_CHANGE_IMPACT_FROM_GIT_DIFF: Command = {
        id: 'memory.detect-change-impact-from-git-diff',
        label: 'Memory: Detect Change Impact from Git Diff',
        iconClass: codicon('git-pull-request')
    };
    export const OPEN_EVENTS: Command = {
        id: 'memory.open-events',
        label: 'Memory: Events Audit',
        iconClass: codicon('history')
    };
    export const OPEN_CONTEXT_CART: Command = {
        id: 'memory.open-context-cart',
        label: 'Memory: Context Cart',
        iconClass: codicon('checklist')
    };
    export const SUGGEST_CHAT_CONTEXT: Command = {
        id: 'memory.suggest-chat-context',
        label: 'Memory: Suggest Context for Current Chat',
        iconClass: codicon('sparkle')
    };
    export const BUILD_APPROVED_CONTEXT: Command = {
        id: 'memory.build-approved-context',
        label: 'Memory: Build Approved Context Pack',
        iconClass: codicon('package')
    };
    export const COPY_APPROVED_CONTEXT: Command = {
        id: 'memory.copy-approved-context',
        label: 'Memory: Copy Approved Context Pack',
        iconClass: codicon('copy')
    };
    export const INSERT_APPROVED_CONTEXT: Command = {
        id: 'memory.insert-approved-context',
        label: 'Memory: Insert Approved Context into Chat',
        iconClass: codicon('comment-add')
    };
    export const INDEX_WORKSPACE: Command = {
        id: 'memory.index-workspace',
        label: 'Memory: Index Workspace',
        iconClass: codicon('sync')
    };
    export const FORGET_WORKSPACE_LEARNING_DATA: Command = {
        id: 'memory.forget-workspace-learning-data',
        label: 'Memory: Forget Workspace Prompt Learning',
        iconClass: codicon('trash')
    };
    export const ADD_FILE_TO_CONTEXT: Command = {
        id: 'memory.add-file-to-context',
        label: 'Memory: Add File to Context Cart',
        iconClass: codicon('add')
    };
    export const ADD_CURRENT_SELECTION_TO_CONTEXT: Command = {
        id: 'memory.add-current-selection-to-context',
        label: 'Memory: Add Current Editor File to Context Cart',
        iconClass: codicon('selection')
    };
    export const SHOW_SYMBOL_RELATIONS: Command = {
        id: 'memory.show-symbol-relations',
        label: 'Memory: Show Symbol Relations',
        iconClass: codicon('references')
    };
}

export namespace MemoryMenus {
    export const CYBERVINCI = CyberVinciMenus.CYBERVINCI;
    export const MEMORY = CyberVinciMenus.MEMORY;
}

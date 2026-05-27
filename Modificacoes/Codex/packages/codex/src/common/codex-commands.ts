// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Command, nls } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS } from '@cybervinci/branding/lib/common';

export namespace CodexExtensionCommands {
    export const OPEN_SIDEBAR: Command = {
        id: 'chatgpt.openSidebar',
        label: nls.localize('theia/cybervinci/codex/openSidebar', 'Open Codex Sidebar'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex'),
        iconClass: CYBERVINCI_MENU_ITEMS.CODEX.iconClass
    };

    export const NEW_THREAD: Command = {
        id: 'chatgpt.newChat',
        label: nls.localize('theia/cybervinci/codex/newThread', 'New Thread in Codex Sidebar'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const NEW_CODEX_PANEL: Command = {
        id: 'chatgpt.newCodexPanel',
        label: nls.localize('theia/cybervinci/codex/newPanel', 'New Codex Panel'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const ADD_TO_THREAD: Command = {
        id: 'chatgpt.addToThread',
        label: nls.localize('theia/cybervinci/codex/addToThread', 'Add to Codex Thread'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const ADD_FILE_TO_THREAD: Command = {
        id: 'chatgpt.addFileToThread',
        label: nls.localize('theia/cybervinci/codex/addFileToThread', 'Add File to Codex Thread'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const IMPLEMENT_TODO: Command = {
        id: 'chatgpt.implementTodo',
        label: nls.localize('theia/cybervinci/codex/implementTodo', 'Implement with Codex'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const OPEN_COMMAND_MENU: Command = {
        id: 'chatgpt.openCommandMenu',
        label: nls.localize('theia/cybervinci/codex/openCommandMenu', 'Open Codex Command Menu'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const SIGN_IN: Command = {
        id: 'cybervinci.codex.signIn',
        label: nls.localize('theia/cybervinci/codex/signIn', 'Sign in with ChatGPT'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const SHOW_LSP_MCP_CLI_ARGS: Command = {
        id: 'chatgpt.showLspMcpCliArgs',
        label: nls.localize('theia/cybervinci/codex/showLspMcpCliArgs', 'Show LSP MCP CLI Args'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const DUMP_NUX_STATE: Command = {
        id: 'chatgpt.dumpNuxState',
        label: nls.localize('theia/cybervinci/codex/dumpNuxState', 'Dump Codex NUX State'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    export const RESET_NUX_STATE: Command = {
        id: 'chatgpt.resetNuxState',
        label: nls.localize('theia/cybervinci/codex/resetNuxState', 'Reset Codex NUX State'),
        category: nls.localize('theia/cybervinci/codex/category', 'Codex')
    };

    /** Backward-compatible aliases */
    export const OPEN_SIDEBAR_ALIAS = { ...OPEN_SIDEBAR, id: 'cybervinci.codex.openSidebar' };
    export const NEW_THREAD_ALIAS = { ...NEW_THREAD, id: 'cybervinci.codex.newThread' };
    export const ADD_TO_THREAD_ALIAS = { ...ADD_TO_THREAD, id: 'cybervinci.codex.addToThread' };
    export const ADD_FILE_TO_THREAD_ALIAS = { ...ADD_FILE_TO_THREAD, id: 'cybervinci.codex.addFileToThread' };
}

export const CODEX_EXTENSION_WIDGET_ID = 'cybervinci-codex-sidebar-widget';

export const CHATGPT_COMMAND_IDS = [
    CodexExtensionCommands.OPEN_SIDEBAR.id,
    CodexExtensionCommands.NEW_THREAD.id,
    CodexExtensionCommands.NEW_CODEX_PANEL.id,
    CodexExtensionCommands.ADD_TO_THREAD.id,
    CodexExtensionCommands.ADD_FILE_TO_THREAD.id,
    CodexExtensionCommands.IMPLEMENT_TODO.id,
    CodexExtensionCommands.OPEN_COMMAND_MENU.id,
    CodexExtensionCommands.SHOW_LSP_MCP_CLI_ARGS.id,
    CodexExtensionCommands.DUMP_NUX_STATE.id,
    CodexExtensionCommands.RESET_NUX_STATE.id
] as const;

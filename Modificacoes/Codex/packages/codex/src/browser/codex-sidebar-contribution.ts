// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AbstractViewContribution, FrontendApplication, FrontendApplicationContribution, KeybindingRegistry, OpenViewArguments } from '@theia/core/lib/browser';
import { Command, CommandHandler, CommandRegistry, ILogger, MenuModelRegistry } from '@theia/core/lib/common';
import { EditorManager, EDITOR_CONTEXT_MENU } from '@theia/editor/lib/browser';
import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { CodexProviderFrontendService } from '@cybervinci/ai-providers/lib/browser/ai-providers-frontend-service';
import { CodexExtensionCommands } from '../common';
import { CodexWebviewWidget } from './webview/codex-webview-widget';
import { CodexConversationEditorContribution } from './codex-conversation-editor-contribution';
import { CodexWebviewHostService } from './host/codex-webview-host-service';

@injectable()
export class CodexSidebarContribution extends AbstractViewContribution<CodexWebviewWidget> implements FrontendApplicationContribution {

    protected readonly nativeCommandHandlers = new Map<string, CommandHandler>();

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(HostedPluginSupport) @optional()
    protected readonly pluginSupport?: HostedPluginSupport;

    @inject(CodexProviderFrontendService)
    protected readonly codexProvider: CodexProviderFrontendService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(CodexConversationEditorContribution)
    protected readonly conversationEditor: CodexConversationEditorContribution;

    @inject(CodexWebviewHostService)
    protected readonly hostService: CodexWebviewHostService;

    constructor() {
        super({
            widgetId: CodexWebviewWidget.ID,
            widgetName: CodexWebviewWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
                rank: 820
            }
        });
    }

    onStart(_app: FrontendApplication): void {
        void this.pluginSupport?.didStart.then(() => this.reassertNativeCommandHandlers());
        this.pluginSupport?.onDidChangePlugins(() => this.reassertNativeCommandHandlers());
    }

    override registerCommands(commands: CommandRegistry): void {
        this.bindNativeCommand(commands, CodexExtensionCommands.OPEN_SIDEBAR, () => this.openCodexSidebar());
        this.quickView?.registerItem({
            label: this.viewLabel,
            open: () => this.openCodexSidebar()
        });
        const register = (command: Command, execute: (...args: unknown[]) => unknown) => {
            this.bindNativeCommand(commands, command, execute);
        };
        register(CodexExtensionCommands.OPEN_SIDEBAR_ALIAS, () => this.openCodexSidebar());
        register(CodexExtensionCommands.NEW_THREAD, () => this.openCodexSidebar());
        register(CodexExtensionCommands.NEW_THREAD_ALIAS, () => this.openCodexSidebar());
        register(CodexExtensionCommands.NEW_CODEX_PANEL, () => this.conversationEditor.openConversationTab('/'));
        register(CodexExtensionCommands.ADD_TO_THREAD, () => this.addEditorSelectionToThread());
        register(CodexExtensionCommands.ADD_TO_THREAD_ALIAS, () => this.addEditorSelectionToThread());
        register(CodexExtensionCommands.ADD_FILE_TO_THREAD, () => this.addCurrentFileToThread());
        register(CodexExtensionCommands.ADD_FILE_TO_THREAD_ALIAS, () => this.addCurrentFileToThread());
        register(CodexExtensionCommands.SIGN_IN, () => this.codexProvider.login());
        register(CodexExtensionCommands.IMPLEMENT_TODO, (_args?: unknown) => this.implementTodo(_args));
        register(CodexExtensionCommands.OPEN_COMMAND_MENU, () => this.openCodexSidebar());
        register(CodexExtensionCommands.SHOW_LSP_MCP_CLI_ARGS, () => undefined);
        register(CodexExtensionCommands.DUMP_NUX_STATE, () => undefined);
        register(CodexExtensionCommands.RESET_NUX_STATE, () => undefined);
    }

    protected bindNativeCommand(commandRegistry: CommandRegistry, command: Command, execute: (...args: unknown[]) => unknown): void {
        const handler: CommandHandler = {
            execute: (...args: unknown[]) => execute(...args)
        };
        this.nativeCommandHandlers.set(command.id, handler);
        if (commandRegistry.getCommand(command.id)) {
            commandRegistry.registerHandler(command.id, handler);
        } else {
            commandRegistry.registerCommand(command, handler);
        }
    }

    protected reassertNativeCommandHandlers(): void {
        for (const [commandId, handler] of this.nativeCommandHandlers.entries()) {
            this.commandRegistry.registerHandler(commandId, handler);
        }
    }

    protected async openCodexSidebar(args: Partial<OpenViewArguments> = {}): Promise<CodexWebviewWidget> {
        try {
            const widget = await this.openView({ activate: true, reveal: true, ...args });
            const area = this.shell.getAreaFor(widget);
            if (area === 'right' && !this.shell.isExpanded('right')) {
                await this.shell.expandPanel('right');
            }
            await this.shell.activateWidget(widget.id);
            return widget;
        } catch (error) {
            this.logger.error('[Codex] Failed to open sidebar webview', error);
            throw error;
        }
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerSubmenu(CyberVinciMenus.CODEX, CYBERVINCI_MENU_ITEMS.CODEX.label, {
            sortString: '1_5',
            icon: CYBERVINCI_MENU_ITEMS.CODEX.iconClass
        });
        for (const [command, order] of [
            [CodexExtensionCommands.OPEN_SIDEBAR, '0'],
            [CodexExtensionCommands.NEW_THREAD, '1'],
            [CodexExtensionCommands.NEW_CODEX_PANEL, '2'],
            [CodexExtensionCommands.SIGN_IN, '3']
        ] as const) {
            menus.registerMenuAction(CyberVinciMenus.CODEX, {
                commandId: command.id,
                label: command.label,
                order
            });
        }
        menus.registerMenuAction([...EDITOR_CONTEXT_MENU, 'codex'], {
            commandId: CodexExtensionCommands.ADD_TO_THREAD.id,
            label: CodexExtensionCommands.ADD_TO_THREAD.label,
            order: '0'
        });
        menus.registerMenuAction([...EDITOR_CONTEXT_MENU, 'codex'], {
            commandId: CodexExtensionCommands.ADD_FILE_TO_THREAD.id,
            label: CodexExtensionCommands.ADD_FILE_TO_THREAD.label,
            order: '1'
        });
    }

    override registerKeybindings(keybindings: KeybindingRegistry): void {
        super.registerKeybindings(keybindings);
        keybindings.registerKeybinding({
            command: CodexExtensionCommands.NEW_THREAD.id,
            keybinding: 'ctrlcmd+n',
            when: 'codexSidebarFocused'
        });
    }

    protected async addEditorSelectionToThread(): Promise<void> {
        const editor = this.editorManager.currentEditor;
        if (!editor) {
            return;
        }
        await this.openCodexSidebar();
        const textEditor = editor.editor;
        const selectedText = textEditor.selection
            ? textEditor.document.getText(textEditor.selection).trim()
            : '';
        const draft = selectedText || `@${editor.editor.uri.toString()}`;
        await this.prefillComposer(draft);
    }

    protected async addCurrentFileToThread(): Promise<void> {
        const editor = this.editorManager.currentEditor;
        if (!editor) {
            return;
        }
        await this.openCodexSidebar();
        await this.prefillComposer(`@${editor.editor.uri.toString()}`);
    }

    protected async implementTodo(args?: unknown): Promise<void> {
        const payload = args as { todoText?: string } | undefined;
        const prompt = payload?.todoText ?? 'Implement the TODO comment';
        await this.openCodexSidebar();
        await this.prefillComposer(prompt);
    }

    protected async prefillComposer(text: string): Promise<void> {
        this.hostService.notifySharedObjectUpdated('composer_prefill', { text, cwd: null });
    }
}

import URI from '@theia/core/lib/common/uri';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService, SelectionService, UriSelection } from '@theia/core/lib/common';
import { UriAwareCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import { CommonMenus, FrontendApplicationContribution, NavigatableWidgetOpenHandler, WidgetOpenerOptions } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { Widget } from '@theia/core/shared/@lumino/widgets';
import { EditorContextMenu, EditorManager, EditorWidget } from '@theia/editor/lib/browser';
import { NavigatorContextMenu } from '@theia/navigator/lib/browser/navigator-contribution';
import { inject, injectable } from '@theia/core/shared/inversify';
import { isRazorVisualEditorFileName, RazorVisualEditorCommands } from '../common';
import { RazorVisualEditorWidget } from './razor-visual-editor-widget';

@injectable()
export class RazorVisualEditorContribution extends NavigatableWidgetOpenHandler<RazorVisualEditorWidget>
    implements FrontendApplicationContribution, CommandContribution, MenuContribution, TabBarToolbarContribution {

    override readonly id = RazorVisualEditorWidget.ID;
    readonly label = RazorVisualEditorWidget.LABEL;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(MessageService)
    protected readonly messages: MessageService;

    canHandle(uri: URI | undefined): number {
        return uri && isRazorVisualEditorFileName(uri.path.toString()) ? 50 : 0;
    }

    onStart(): void {
        // OpenHandler registration is enough; the visual editor should not replace the text editor by default.
    }

    override async open(uri: URI, options?: WidgetOpenerOptions): Promise<RazorVisualEditorWidget> {
        return super.open(uri, options);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(RazorVisualEditorCommands.OPEN, UriAwareCommandHandler.MonoSelect(this.selectionService, {
            execute: uri => this.openSupported(uri),
            isEnabled: uri => this.canHandle(uri) > 0,
            isVisible: uri => this.canHandle(uri) > 0
        }));

        commands.registerCommand(RazorVisualEditorCommands.OPEN_CURRENT, {
            execute: widget => this.openCurrentVisually(widget),
            isEnabled: widget => this.currentSupportedUri(widget) !== undefined,
            isVisible: widget => this.currentSupportedUri(widget) !== undefined
        });

        commands.registerCommand(RazorVisualEditorCommands.SAVE, {
            execute: () => this.activeVisualWidget()?.save(),
            isEnabled: () => this.activeVisualWidget() !== undefined,
            isVisible: () => this.activeVisualWidget() !== undefined
        });

        commands.registerCommand(RazorVisualEditorCommands.SAVE_AS, {
            execute: () => this.activeVisualWidget()?.saveAs(),
            isEnabled: () => this.activeVisualWidget() !== undefined,
            isVisible: () => this.activeVisualWidget() !== undefined
        });

        commands.registerCommand(RazorVisualEditorCommands.SHOW_TOKENS, {
            execute: () => this.activeVisualWidget()?.showTokens(),
            isEnabled: () => this.activeVisualWidget() !== undefined,
            isVisible: () => this.activeVisualWidget() !== undefined
        });

        commands.registerCommand(RazorVisualEditorCommands.SHOW_DIFF, {
            execute: () => this.activeVisualWidget()?.showDiff(),
            isEnabled: () => this.activeVisualWidget() !== undefined,
            isVisible: () => this.activeVisualWidget() !== undefined
        });

        commands.registerCommand(RazorVisualEditorCommands.RELOAD, {
            execute: () => this.activeVisualWidget()?.reload(),
            isEnabled: () => this.activeVisualWidget() !== undefined,
            isVisible: () => this.activeVisualWidget() !== undefined
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(NavigatorContextMenu.NAVIGATION, {
            commandId: RazorVisualEditorCommands.OPEN.id,
            label: 'Open With CyberVinci Visual Editor',
            order: '1_visual'
        });
        menus.registerMenuAction(EditorContextMenu.NAVIGATION, {
            commandId: RazorVisualEditorCommands.OPEN_CURRENT.id,
            label: RazorVisualEditorCommands.OPEN_CURRENT.label,
            order: '1_visual'
        });
        menus.registerMenuAction(CommonMenus.FILE_SAVE, {
            commandId: RazorVisualEditorCommands.SAVE.id,
            label: RazorVisualEditorCommands.SAVE.label,
            order: '9'
        });
        menus.registerMenuAction(CommonMenus.FILE_SAVE, {
            commandId: RazorVisualEditorCommands.SAVE_AS.id,
            label: RazorVisualEditorCommands.SAVE_AS.label,
            order: '10'
        });
    }

    registerToolbarItems(toolbar: TabBarToolbarRegistry): void {
        toolbar.registerItem({
            id: RazorVisualEditorCommands.OPEN_CURRENT.id,
            command: RazorVisualEditorCommands.OPEN_CURRENT.id,
            tooltip: 'Edit visually with CyberVinci',
            priority: 20
        });
        toolbar.registerItem({
            id: RazorVisualEditorCommands.SAVE.id,
            command: RazorVisualEditorCommands.SAVE.id,
            tooltip: RazorVisualEditorCommands.SAVE.label,
            priority: 21
        });
        toolbar.registerItem({
            id: RazorVisualEditorCommands.SHOW_DIFF.id,
            command: RazorVisualEditorCommands.SHOW_DIFF.id,
            tooltip: RazorVisualEditorCommands.SHOW_DIFF.label,
            priority: 22
        });
    }

    protected async openSupported(uri: URI | undefined): Promise<void> {
        if (!uri || this.canHandle(uri) <= 0) {
            this.messages.warn('Select an .html, .htm or .cshtml file first.');
            return;
        }
        await this.open(uri, { mode: 'activate' });
    }

    protected async openCurrentVisually(widget?: Widget): Promise<void> {
        const uri = this.currentSupportedUri(widget);
        if (!uri) {
            this.messages.warn('Open an .html, .htm or .cshtml file first.');
            return;
        }
        await this.open(uri, { mode: 'activate' });
    }

    protected currentSupportedUri(widget?: Widget): URI | undefined {
        const selectedUri = UriSelection.getUri(widget) ?? UriSelection.getUri(this.selectionService.selection);
        if (selectedUri && this.canHandle(selectedUri) > 0) {
            return selectedUri;
        }
        const editorUri = this.currentEditorWidget(widget)?.editor.uri;
        return editorUri && this.canHandle(editorUri) > 0 ? editorUri : undefined;
    }

    protected currentEditorWidget(widget?: Widget): EditorWidget | undefined {
        const current = widget ?? this.editorManager.currentEditor;
        return current instanceof EditorWidget ? current : undefined;
    }

    protected activeVisualWidget(): RazorVisualEditorWidget | undefined {
        const active = this.shell.activeWidget;
        return active instanceof RazorVisualEditorWidget ? active : undefined;
    }
}

export const RazorVisualEditorOpenHandler = Symbol('RazorVisualEditorOpenHandler');

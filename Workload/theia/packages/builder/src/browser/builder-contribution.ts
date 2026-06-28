import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService, SelectionService, UriSelection } from '@theia/core/lib/common';
import { UriAwareCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import { CommonMenus, FrontendApplicationContribution, NavigatableWidgetOpenHandler, OpenerService, QuickInputService, WidgetOpenerOptions, open } from '@theia/core/lib/browser';
import { FileDialogService } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { deserializeBuilderDocumentJson, serializeBuilderDocumentJson } from '@cybervinci/builder-schema';
import { Builder_FILE_EXTENSION, BuilderCommands, BuilderService, isBuilderFileName } from '../common';
import {
    BUILDER_DEMO_LANDING_PAGE_BASENAME,
    BUILDER_DEMO_LANDING_PAGE_VERSION,
    createBuilderDemoLandingDocument
} from '../common/builder-demo-landing';
import { persistBuilderJsonFile } from './builder-file-persistence';
import { exportPageToReactTsx } from './services/page-export-service';
import { BuilderWidget } from './builder-widget';

export namespace BuilderMenus {
    export const BUILDER = CyberVinciMenus.BUILDER;
}

@injectable()
export class BuilderContribution extends NavigatableWidgetOpenHandler<BuilderWidget> implements FrontendApplicationContribution, CommandContribution, MenuContribution {

    override readonly id = BuilderWidget.ID;
    readonly label = BuilderWidget.LABEL;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(FileDialogService)
    protected readonly fileDialogService: FileDialogService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(BuilderService)
    protected readonly service: BuilderService;

    canHandle(uri: URI | undefined): number {
        return uri && isBuilderFileName(uri.path.toString()) ? 200000 : 0;
    }

    onStart(): void {
        void this.openDemoLandingPageOnStart();
    }

    override async open(uri: URI, options?: WidgetOpenerOptions): Promise<BuilderWidget> {
        return super.open(uri, options);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(BuilderCommands.OPEN, UriAwareCommandHandler.MonoSelect(this.selectionService, {
            execute: uri => this.openInContext(uri),
            isEnabled: () => true,
            isVisible: () => true
        }));
        commands.registerCommand(BuilderCommands.NEW_PAGE, {
            execute: () => this.newPage()
        });
        commands.registerCommand(BuilderCommands.OPEN_PAGE_JSON, {
            execute: () => this.openPageJson()
        });
        commands.registerCommand(BuilderCommands.SAVE_PAGE, {
            execute: () => this.savePage(),
            isEnabled: () => this.activeWidget() !== undefined,
            isVisible: () => this.activeWidget() !== undefined
        });
        commands.registerCommand(BuilderCommands.PREVIEW_PAGE, {
            execute: () => this.previewPage(),
            isEnabled: () => this.activeWidget() !== undefined,
            isVisible: () => this.activeWidget() !== undefined
        });
        commands.registerCommand(BuilderCommands.EXPORT_HTML, {
            execute: selection => this.exportHtml(selection),
            isEnabled: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined,
            isVisible: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined
        });
        commands.registerCommand(BuilderCommands.EXPORT_REACT, {
            execute: selection => this.exportReact(selection),
            isEnabled: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined,
            isVisible: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined
        });
        commands.registerCommand(BuilderCommands.GENERATE_UI_WITH_AI, {
            execute: selection => this.generateUiWithAi(selection)
        });
        commands.registerCommand(BuilderCommands.Legacy.CVUI_OPEN, {
            execute: selection => this.openInContext(selection)
        });
        commands.registerCommand(BuilderCommands.Legacy.CVUI_EXPORT_HTML, {
            execute: selection => this.exportHtml(selection),
            isEnabled: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined,
            isVisible: selection => this.selectedBuilderUri(selection) !== undefined || this.activeWidget() !== undefined
        });
        commands.registerCommand(BuilderCommands.Legacy.CVUI_GENERATE_UI_WITH_AI, {
            execute: selection => this.generateUiWithAi(selection)
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(BuilderMenus.BUILDER, CYBERVINCI_MENU_ITEMS.BUILDER.label, {
            sortString: '7',
            icon: CYBERVINCI_MENU_ITEMS.BUILDER.iconClass
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.OPEN.id,
            label: BuilderCommands.OPEN.label,
            order: '0'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.NEW_PAGE.id,
            label: BuilderCommands.NEW_PAGE.label,
            order: '1'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.OPEN_PAGE_JSON.id,
            label: BuilderCommands.OPEN_PAGE_JSON.label,
            order: '2'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.SAVE_PAGE.id,
            label: BuilderCommands.SAVE_PAGE.label,
            order: '3'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.PREVIEW_PAGE.id,
            label: BuilderCommands.PREVIEW_PAGE.label,
            order: '4'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.EXPORT_HTML.id,
            label: BuilderCommands.EXPORT_HTML.label,
            order: '5'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.EXPORT_REACT.id,
            label: BuilderCommands.EXPORT_REACT.label,
            order: '6'
        });
        menus.registerMenuAction(BuilderMenus.BUILDER, {
            commandId: BuilderCommands.GENERATE_UI_WITH_AI.id,
            label: BuilderCommands.GENERATE_UI_WITH_AI.label,
            order: '7'
        });
        menus.registerMenuAction(CommonMenus.FILE_NEW, {
            commandId: BuilderCommands.NEW_PAGE.id,
            label: BuilderCommands.NEW_PAGE.label,
            order: '9'
        });
    }

    protected selectedBuilderUri(selection: unknown): URI | undefined {
        const candidate = UriSelection.getUri(selection);
        return candidate && this.canHandle(candidate) > 0 ? candidate : undefined;
    }

    protected resolveOpenCommandUri(selection: unknown): URI | undefined {
        const resolvedFromSelection = UriSelection.getUri(selection);
        if (resolvedFromSelection && this.canHandle(resolvedFromSelection) > 0) {
            return resolvedFromSelection;
        }
        const active = this.activeWidget();
        if (active && this.canHandle(active.getUri()) > 0) {
            return active.getUri();
        }
        return this.selectedBuilderUri(this.selectionService.selection);
    }

    protected async openInContext(selection: unknown): Promise<void> {
        const resolvedUri = this.resolveOpenCommandUri(selection);
        if (!resolvedUri) {
            await this.openPageJsonOrCreate();
            return;
        }
        await this.open(resolvedUri, { mode: 'activate' });
    }

    protected async openPageJsonOrCreate(): Promise<void> {
        const opened = await this.openPageJson();
        if (!opened) {
            await this.newPage();
        }
    }

    protected async openDemoLandingPageOnStart(): Promise<void> {
        try {
            const root = await this.workspaceRootUri();
            const target = root.resolve(`${BUILDER_DEMO_LANDING_PAGE_BASENAME}${Builder_FILE_EXTENSION}`);
            if (!await this.fileService.exists(target) || await this.shouldRefreshDemoLandingPage(target)) {
                const document = createBuilderDemoLandingDocument({
                    id: this.pageIdFromUri(target),
                    route: '/launch-studio',
                    createdBy: 'CyberVinci UI Builder'
                });
                await persistBuilderJsonFile(this.fileService, target, `${serializeBuilderDocumentJson(document, { space: 2 })}\n`);
            }
            await open(this.openerService, target, { activate: true });
        } catch (error) {
            if (error instanceof Error && error.message.includes('Open a workspace')) {
                return;
            }
            this.messages.warn(`CyberVinci Builder demo page could not be opened automatically: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected async shouldRefreshDemoLandingPage(target: URI): Promise<boolean> {
        try {
            const existing = deserializeBuilderDocumentJson((await this.fileService.read(target)).value.toString(), {
                sourceName: target.path.base
            });
            const isManagedDemo = existing.metadata.id === BUILDER_DEMO_LANDING_PAGE_BASENAME
                || existing.page.id === BUILDER_DEMO_LANDING_PAGE_BASENAME;
            return isManagedDemo && existing.metadata.builderDemoVersion !== BUILDER_DEMO_LANDING_PAGE_VERSION;
        } catch {
            return true;
        }
    }

    protected async newPage(): Promise<void> {
        const root = await this.workspaceRootUri();
        const target = await this.nextAvailablePageUri(root, 'new-page');
        const pageId = this.pageIdFromUri(target);
        const result = await this.service.createDocument({
            id: pageId,
            name: 'New Page',
            title: 'New Page',
            route: `/${pageId}`
        });
        await persistBuilderJsonFile(this.fileService, target, result.json);
        await open(this.openerService, target, { activate: true });
    }

    protected async openPageJson(): Promise<boolean> {
        const root = await this.workspaceRootUri();
        const selected = await this.fileDialogService.showOpenDialog({
            title: 'Open CyberVinci page JSON',
            openLabel: 'Open Page',
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false
        }, await this.fileService.resolve(root));

        if (!selected) {
            return false;
        }
        if (!isBuilderFileName(selected.path.toString())) {
            this.messages.warn(`CyberVinci Page Builder supports ${Builder_FILE_EXTENSION}, .builder.json and .cvui.json files.`);
            return false;
        }
        await open(this.openerService, selected, { activate: true });
        return true;
    }

    protected async savePage(): Promise<void> {
        const widget = this.activeWidget();
        if (!widget) {
            this.messages.warn('Open a CyberVinci page before saving.');
            return;
        }
        await widget.savePage();
    }

    protected previewPage(): void {
        const widget = this.activeWidget();
        if (!widget) {
            this.messages.warn('Open a CyberVinci page before previewing.');
            return;
        }
        widget.showPreview();
    }

    protected async nextAvailablePageUri(root: URI, baseName: string): Promise<URI> {
        for (let index = 0; ; index++) {
            const suffix = index === 0 ? '' : `-${index + 1}`;
            const candidate = root.resolve(`${baseName}${suffix}${Builder_FILE_EXTENSION}`);
            if (!await this.fileService.exists(candidate)) {
                return candidate;
            }
        }
    }

    protected pageIdFromUri(uri: URI): string {
        return uri.path.base.replace(/\.(cvpage|builder|cvui)\.json$/, '');
    }

    protected async exportHtml(selection: unknown): Promise<void> {
        const widget = this.activeWidget();
        const uri = widget?.getUri() ?? this.selectedBuilderUri(selection);
        if (!uri) {
            this.messages.warn('Select or open a Builder document before exporting.');
            return;
        }
        const json = widget?.getUri().isEqual(uri) ? widget.getJson() : (await this.fileService.read(uri)).value.toString();
        const exportDir = await this.selectExportDirectory(uri, 'Select HTML export destination');
        if (!exportDir) {
            return;
        }
        const result = await this.service.exportHtml({ json });
        await this.writeExportFiles(exportDir, result.files);
        await this.openExportPreview(exportDir, result.files);
        this.messages.info(`Exported Builder HTML to ${exportDir.path.toString()}`);
    }

    protected async exportReact(selection: unknown): Promise<void> {
        const widget = this.activeWidget();
        const uri = widget?.getUri() ?? this.selectedBuilderUri(selection);
        if (!uri) {
            this.messages.warn('Select or open a Builder document before exporting React.');
            return;
        }

        const document = widget?.getUri().isEqual(uri)
            ? widget.getValidatedDocument()
            : deserializeBuilderDocumentJson((await this.fileService.read(uri)).value.toString(), {
                sourceName: uri.path.base
            });
        const exportDir = await this.selectExportDirectory(uri, 'Select React export destination');
        if (!exportDir) {
            return;
        }
        const result = exportPageToReactTsx(document);
        await this.writeExportFiles(exportDir, result.files);
        const warningText = result.warnings.length > 0 ? ` (${result.warnings.length} warning(s))` : '';
        this.messages.info(`Exported React TSX to ${exportDir.path.toString()}${warningText}`);
    }

    protected async selectExportDirectory(sourceUri: URI, title: string): Promise<URI | undefined> {
        return this.fileDialogService.showOpenDialog({
            title,
            openLabel: 'Export Here',
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        }, await this.fileService.resolve(sourceUri.parent));
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

    protected async generateUiWithAi(selection: unknown): Promise<void> {
        const prompt = await this.quickInputService.input({
            placeHolder: 'Describe the UI to generate or change'
        });
        if (!prompt) {
            return;
        }
        const widget = this.activeWidget();
        let uri = this.selectedBuilderUri(selection) ?? widget?.getUri();
        let currentJson: string | undefined;
        if (uri) {
            currentJson = widget?.getUri().isEqual(uri) ? widget.getJson() : (await this.fileService.read(uri)).value.toString();
        } else {
            const root = await this.workspaceRootUri();
            uri = await this.nextAvailablePageUri(root, this.aiPageBaseName(prompt));
            const pageId = this.pageIdFromUri(uri);
            const created = await this.service.createDocument({
                id: pageId,
                name: prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt,
                title: prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt,
                route: `/${pageId}`,
                createdBy: 'CyberVinci UI Builder AI'
            });
            currentJson = created.json;
            await persistBuilderJsonFile(this.fileService, uri, currentJson);
        }
        const result = await this.service.generateUiWithAi({
            prompt,
            currentJson
        });
        const targetWidget = await this.open(uri, { mode: 'activate' });
        await targetWidget.stageAiPatch(prompt, result.patch);
        this.messages.info(`Generated ${result.patch.operations.length} Builder AI operation(s). Review the AI panel and click Aceitar to apply it to ${uri.path.base}.`);
    }

    protected aiPageBaseName(prompt: string): string {
        const slug = prompt
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48)
            .replace(/-+$/g, '');
        return slug ? `ai-${slug}` : 'ai-ui-page';
    }

    protected async workspaceRootUri(): Promise<URI> {
        const roots = await this.workspaceService.roots;
        const root = roots[0]?.resource;
        if (root) {
            return root;
        }
        throw new Error('Open a workspace before creating a Builder page.');
    }

    protected activeWidget(): BuilderWidget | undefined {
        const active = this.shell.activeWidget;
        return active instanceof BuilderWidget ? active : undefined;
    }

    get defaultIconClass(): string {
        return CYBERVINCI_MENU_ITEMS.BUILDER.iconClass;
    }
}

export const BuilderOpenHandler = Symbol('BuilderOpenHandler');

// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { FileUri } from '@theia/core/lib/common/file-uri';
import { AbstractViewContribution, FrontendApplication, QuickInputService } from '@theia/core/lib/browser';
import { CommandRegistry, MenuModelRegistry, MessageService, nls } from '@theia/core';
import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { LibraryService, DocsLockfile, InstalledDocsPackage } from '../common/library-service';
import { LibraryCommands } from './library-commands';
import { LibraryWidget } from './library-widget';

@injectable()
export class LibraryContribution extends AbstractViewContribution<LibraryWidget> {
    @inject(LibraryService)
    protected readonly libraryService: LibraryService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    constructor() {
        super({
            widgetId: LibraryWidget.ID,
            widgetName: LibraryWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 850
            },
            toggleCommandId: 'library:toggle',
            toggleKeybinding: 'ctrlcmd+alt+d'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        // The manager is available from the view container and command palette, but not opened by default.
    }

    override registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
        registry.registerCommand(LibraryCommands.OPEN_MANAGER, {
            execute: () => this.openView({ activate: true })
        });
        registry.registerCommand(LibraryCommands.DETECT_WORKSPACE, {
            execute: async () => this.detectWorkspace()
        });
        registry.registerCommand(LibraryCommands.INSTALL_PACKAGE, {
            execute: async () => this.installPackage()
        });
        registry.registerCommand(LibraryCommands.ADD_SOURCE, {
            execute: () => this.messageService.info(nls.localize(
                'theia/ai/docs/addSource/notYet',
                'Use THEIA_AI_DOCS_REGISTRY to point at a local registry folder, then add a manifest/version file or generate a contribution from an installed package.'
            ))
        });
        registry.registerCommand(LibraryCommands.CHECK_UPDATES, {
            execute: async () => this.checkUpdates()
        });
        registry.registerCommand(LibraryCommands.REBUILD_INDEX, {
            execute: async () => this.rebuildIndex()
        });
        registry.registerCommand(LibraryCommands.PIN_VERSION, {
            execute: async () => this.pinVersion()
        });
        registry.registerCommand(LibraryCommands.GENERATE_LOCKFILE, {
            execute: async () => this.generateLockfile()
        });
        registry.registerCommand(LibraryCommands.UPDATE_LOCKFILE, {
            execute: async () => this.updateLockfile()
        });
        registry.registerCommand(LibraryCommands.VALIDATE_LOCKFILE, {
            execute: async () => this.validateLockfile()
        });
        registry.registerCommand(LibraryCommands.VALIDATE_REGISTRY, {
            execute: async () => this.validateRegistry()
        });
        registry.registerCommand(LibraryCommands.GENERATE_CONTRIBUTION, {
            execute: async () => this.generateContribution()
        });
        registry.registerCommand(LibraryCommands.OPEN_STORE, {
            execute: async () => {
                const storePath = await this.libraryService.getStorePath();
                this.messageService.info(nls.localize('theia/ai/docs/storePath/message', 'Local documentation store: {0}', storePath));
            }
        });
        registry.registerCommand(LibraryCommands.SEARCH_INSTALLED, {
            execute: async () => this.searchInstalled()
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerSubmenu(CyberVinciMenus.DOCUMENTATION, nls.localize('theia/ai/docs/cyberVinci/menu', CYBERVINCI_MENU_ITEMS.DOCUMENTATION.label), {
            sortString: '3',
            icon: CYBERVINCI_MENU_ITEMS.DOCUMENTATION.iconClass
        });
        menus.registerMenuAction(CyberVinciMenus.DOCUMENTATION, {
            commandId: LibraryCommands.OPEN_MANAGER.id,
            label: nls.localize('theia/ai/docs/cyberVinci/openManager', 'Open Manager'),
            order: '0'
        });
        menus.registerMenuAction(CyberVinciMenus.DOCUMENTATION, {
            commandId: LibraryCommands.DETECT_WORKSPACE.id,
            label: nls.localize('theia/ai/docs/cyberVinci/detectWorkspace', 'Detect Workspace Documentation'),
            order: '1'
        });
        menus.registerMenuAction(CyberVinciMenus.DOCUMENTATION, {
            commandId: LibraryCommands.SEARCH_INSTALLED.id,
            label: nls.localize('theia/ai/docs/cyberVinci/searchInstalled', 'Search Installed Documentation'),
            order: '2'
        });
        menus.registerMenuAction(CyberVinciMenus.DOCUMENTATION, {
            commandId: LibraryCommands.CHECK_UPDATES.id,
            label: nls.localize('theia/ai/docs/cyberVinci/checkUpdates', 'Check Updates'),
            order: '3'
        });
    }

    protected async detectWorkspace(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const detection = await this.libraryService.detectWorkspace(workspacePath);
        const widget = await this.openView({ activate: true });
        await widget.refresh();
        this.messageService.info(nls.localize(
            'theia/ai/docs/detected/message',
            'Detected {0} dependencies and {1} documentation suggestions.',
            detection.dependencies.length,
            detection.suggestions.length
        ));
    }

    protected async installPackage(): Promise<void> {
        const available = await this.libraryService.listAvailablePackages();
        const items = available.flatMap(packageInfo => packageInfo.versions.map(version => ({
            label: `${packageInfo.name} ${version.version}`,
            description: packageInfo.id,
            packageId: packageInfo.id,
            version: version.version
        })));
        const selection = await this.quickInputService.showQuickPick(items, {
            placeholder: nls.localize('theia/ai/docs/install/placeholder', 'Select documentation package and version')
        });
        if (!selection) {
            return;
        }
        const workspacePath = await this.getWorkspacePath(false);
        const installed = await this.libraryService.installPackage({
            packageId: selection.packageId,
            version: selection.version,
            workspacePath,
            pinToWorkspace: Boolean(workspacePath)
        });
        await this.refreshWidgetIfOpen();
        this.messageService.info(nls.localize('theia/ai/docs/install/success', 'Installed {0} {1}.', installed.name, installed.version));
    }

    protected async pinVersion(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const selected = await this.pickInstalledPackage();
        if (!selected) {
            return;
        }
        await this.libraryService.pinPackageToWorkspace(workspacePath, selected.id, selected.version);
        await this.refreshWidgetIfOpen();
        this.messageService.info(nls.localize('theia/ai/docs/pin/success', 'Pinned {0} {1} in .context-docs.lock.yaml.', selected.name, selected.version));
    }

    protected async generateLockfile(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const detection = await this.libraryService.detectWorkspace(workspacePath);
        const installed = await this.libraryService.listInstalledPackages();
        const installedById = new Map(installed.map(packageInfo => [packageInfo.id, packageInfo]));
        const packageIds = new Set(detection.suggestions
            .filter(suggestion => installedById.has(suggestion.packageId))
            .map(suggestion => suggestion.packageId));
        if (packageIds.size === 0) {
            installed.forEach(packageInfo => packageIds.add(packageInfo.id));
        }
        if (packageIds.size === 0) {
            this.messageService.warn(nls.localize('theia/ai/docs/lock/noInstalled', 'Install documentation before generating a lockfile.'));
            return;
        }
        let lockfile: DocsLockfile | undefined;
        for (const packageId of packageIds) {
            const installedPackage = installedById.get(packageId);
            if (installedPackage) {
                lockfile = await this.libraryService.pinPackageToWorkspace(workspacePath, installedPackage.id, installedPackage.version);
            }
        }
        await this.refreshWidgetIfOpen();
        this.messageService.info(nls.localize('theia/ai/docs/lock/generated', 'Generated .context-docs.lock.yaml with {0} package(s).', lockfile?.docs.length ?? 0));
    }

    protected async updateLockfile(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const lockfile = await this.libraryService.readLockfile(workspacePath);
        if (!lockfile || lockfile.docs.length === 0) {
            await this.generateLockfile();
            return;
        }
        for (const pinned of lockfile.docs) {
            await this.libraryService.pinPackageToWorkspace(workspacePath, pinned.id, pinned.resolvedVersion);
        }
        await this.refreshWidgetIfOpen();
        this.messageService.info(nls.localize('theia/ai/docs/lock/updated', 'Updated .context-docs.lock.yaml with currently installed metadata.'));
    }

    protected async validateLockfile(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const lockfile = await this.libraryService.readLockfile(workspacePath);
        if (!lockfile) {
            this.messageService.warn(nls.localize('theia/ai/docs/lock/missing', 'No .context-docs.lock.yaml found in this workspace.'));
            return;
        }
        const installed = await this.libraryService.listInstalledPackages();
        const issues: string[] = [];
        for (const pinned of lockfile.docs) {
            const installedPackage = installed.find(candidate => candidate.id === pinned.id && candidate.version === pinned.resolvedVersion);
            if (!installedPackage) {
                issues.push(`${pinned.id}@${pinned.resolvedVersion}: not installed`);
                continue;
            }
            if (pinned.artifactSha256 && installedPackage.contentHashSha256 && pinned.artifactSha256 !== installedPackage.contentHashSha256) {
                issues.push(`${pinned.id}@${pinned.resolvedVersion}: checksum mismatch`);
            }
        }
        if (issues.length > 0) {
            this.messageService.error(nls.localize('theia/ai/docs/lock/invalid', 'Lockfile validation failed: {0}', issues.join('; ')));
            return;
        }
        this.messageService.info(nls.localize('theia/ai/docs/lock/valid', 'Lockfile is valid for {0} package(s).', lockfile.docs.length));
    }

    protected async validateRegistry(): Promise<void> {
        const result = await this.libraryService.validateRegistry();
        if (result.valid) {
            this.messageService.info(nls.localize('theia/ai/docs/registry/valid', 'Documentation registry is valid: {0}', result.source));
            return;
        }
        this.messageService.error(nls.localize(
            'theia/ai/docs/registry/invalid',
            'Documentation registry validation failed: {0}',
            result.errors.map(error => `${error.file ?? result.source}: ${error.message}`).join('; ')
        ));
    }

    protected async rebuildIndex(): Promise<void> {
        const selected = await this.pickInstalledPackage();
        if (!selected) {
            return;
        }
        const rebuilt = await this.libraryService.installPackage({
            packageId: selected.id,
            version: selected.version,
            allowUnknownLicense: true
        });
        await this.refreshWidgetIfOpen();
        this.messageService.info(nls.localize('theia/ai/docs/rebuild/success', 'Rebuilt local index for {0} {1}.', rebuilt.name, rebuilt.version));
    }

    protected async checkUpdates(): Promise<void> {
        const runs = await this.libraryService.checkUpdates();
        await this.refreshWidgetIfOpen();
        const changed = runs.filter(run => run.result === 'new_version_available').length;
        this.messageService.info(nls.localize('theia/ai/docs/check/result', 'Checked {0} packages. {1} have newer versions.', runs.length, changed));
    }

    protected async searchInstalled(): Promise<void> {
        const query = await this.quickInputService.input({
            placeHolder: nls.localize('theia/ai/docs/search/placeholder', 'Search installed documentation')
        });
        if (!query) {
            return;
        }
        const results = await this.libraryService.searchDocs(query, { maxResults: 5 });
        if (results.length === 0) {
            this.messageService.info(nls.localize('theia/ai/docs/search/none', 'No local documentation results.'));
            return;
        }
        const selected = await this.quickInputService.showQuickPick(results.map(result => ({
            label: `${result.packageName} ${result.version}: ${result.heading ?? result.title}`,
            description: result.snippet,
            result
        })), {
            placeholder: nls.localize('theia/ai/docs/search/results', 'Search results')
        });
        if (selected) {
            this.messageService.info(`${selected.result.packageName} ${selected.result.version}: ${selected.result.snippet}`);
        }
    }

    protected async generateContribution(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const selected = await this.pickInstalledPackage();
        if (!selected) {
            return;
        }
        const result = await this.libraryService.generateRegistryContribution(selected.id, selected.version, workspacePath);
        const gitInfo = result.branchName
            ? nls.localize('theia/ai/docs/contribution/gitInfo', ' Branch: {0}. Commit message: {1}.', result.branchName, result.commitMessage ?? '')
            : '';
        this.messageService.info(nls.localize('theia/ai/docs/contribution/success', 'Generated registry contribution at {0}.{1}', result.contributionPath, gitInfo));
    }

    protected async pickInstalledPackage(): Promise<InstalledDocsPackage | undefined> {
        const installed = await this.libraryService.listInstalledPackages();
        if (installed.length === 0) {
            this.messageService.warn(nls.localize('theia/ai/docs/noInstalled', 'No documentation packages are installed yet.'));
            return undefined;
        }
        const selection = await this.quickInputService.showQuickPick(installed.map(packageInfo => ({
            label: `${packageInfo.name} ${packageInfo.version}`,
            description: packageInfo.id,
            packageInfo
        })));
        return selection?.packageInfo;
    }

    protected async getWorkspacePath(showError = true): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        if (!root) {
            if (showError) {
                this.messageService.error(nls.localize('theia/ai/docs/noWorkspace', 'Open a workspace before using documentation lockfile features.'));
            }
            return undefined;
        }
        return FileUri.fsPath(root.resource.toString());
    }

    protected async refreshWidgetIfOpen(): Promise<void> {
        const widget = this.tryGetWidget();
        if (widget) {
            await widget.refresh();
        }
    }

    get defaultIconClass(): string {
        return CYBERVINCI_MENU_ITEMS.DOCUMENTATION.iconClass;
    }
}

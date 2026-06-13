import URI from '@theia/core/lib/common/uri';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { CommandRegistry, CommandService, MenuModelRegistry, MessageService, QuickPickItem, SelectionService, UriSelection } from '@theia/core/lib/common';
import { AbstractViewContribution, open, OpenerService, QuickInputService } from '@theia/core/lib/browser';
import { NavigatorContextMenu } from '@theia/navigator/lib/browser/navigator-contribution';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { DebugConfigurationManager } from '@theia/debug/lib/browser/debug-configuration-manager';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { DebugSessionOptions } from '@theia/debug/lib/browser/debug-session-options';
import { inject, injectable } from '@theia/core/shared/inversify';
import {
    CSharpKitCommands,
    CSharpKitService,
    CSharpNuGetSearchPackage,
    CSharpPackageUpdate,
    CSharpProjectItemTemplate,
    CSharpProjectSummary,
    CSharpProjectTemplate,
    CSharpSolutionSummary,
    CSharpWorkspaceInspection,
    isCSharpProjectFileName,
    isCSharpSolutionFileName,
    isCSharpSourceFileName
} from '../common';
import { CSharpKitDiagnosticsContribution } from './csharp-kit-diagnostics-contribution';
import { CSharpKitWidget } from './csharp-kit-widget';

const MINI_BROWSER_OPEN_URL_COMMAND = 'mini-browser.openUrl';

interface ProjectPick extends QuickPickItem {
    project: CSharpProjectSummary;
}

interface ProjectTemplatePick extends QuickPickItem {
    template: CSharpProjectTemplate;
}

interface ProjectItemTemplatePick extends QuickPickItem {
    template: CSharpProjectItemTemplate;
}

interface LaunchProfilePick extends QuickPickItem {
    project: CSharpProjectSummary;
    profileName: string;
}

interface LaunchUrlPick extends QuickPickItem {
    project: CSharpProjectSummary;
    profileName: string;
    url: string;
}

interface PublishProfilePick extends QuickPickItem {
    project: CSharpProjectSummary;
    profileName: string;
}

interface SolutionPick extends QuickPickItem {
    solution?: CSharpSolutionSummary;
    createSolution?: boolean;
}

interface SolutionProjectPick extends QuickPickItem {
    solution: CSharpSolutionSummary;
    projectPath: string;
}

interface CodeContextTarget {
    projectPath?: string;
    solutionPath?: string;
}

interface CodeContextTargetPick extends QuickPickItem {
    target: CodeContextTarget;
}

interface CodeContextCommandOptions extends CodeContextTarget {
    solutionOnly?: boolean;
}

interface NuGetPackagePick extends QuickPickItem {
    package: CSharpNuGetSearchPackage;
}

interface NuGetUpdatePick extends QuickPickItem {
    update: CSharpPackageUpdate;
}

@injectable()
export class CSharpKitContribution extends AbstractViewContribution<CSharpKitWidget> {

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(DebugConfigurationManager)
    protected readonly debugConfigurationManager: DebugConfigurationManager;

    @inject(DebugSessionManager)
    protected readonly debugSessionManager: DebugSessionManager;

    @inject(CSharpKitDiagnosticsContribution)
    protected readonly diagnostics: CSharpKitDiagnosticsContribution;

    constructor() {
        super({
            widgetId: CSharpKitWidget.ID,
            widgetName: CSharpKitWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
                rank: 520
            },
            toggleCommandId: CSharpKitCommands.OPEN.id
        });
    }

    override registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        commands.registerCommand(CSharpKitCommands.REFRESH, {
            execute: async () => (await this.openView({ activate: true })).refresh()
        });
        commands.registerCommand(CSharpKitCommands.NEW_PROJECT, {
            execute: () => this.newProject()
        });
        commands.registerCommand(CSharpKitCommands.NEW_ITEM, {
            execute: selection => this.newProjectItem(selection)
        });
        commands.registerCommand(CSharpKitCommands.NEW_SOLUTION, {
            execute: () => this.newSolution()
        });
        commands.registerCommand(CSharpKitCommands.ADD_PROJECT_TO_SOLUTION, {
            execute: selection => this.addProjectToSolution(selection)
        });
        commands.registerCommand(CSharpKitCommands.REMOVE_PROJECT_FROM_SOLUTION, {
            execute: selection => this.removeProjectFromSolution(selection)
        });
        commands.registerCommand(CSharpKitCommands.ADD_PROJECT_REFERENCE, {
            execute: selection => this.addProjectReference(selection)
        });
        commands.registerCommand(CSharpKitCommands.REMOVE_PROJECT_REFERENCE, {
            execute: selection => this.removeProjectReference(selection)
        });
        commands.registerCommand(CSharpKitCommands.RESTORE, {
            execute: async selection => (await this.openView({ activate: true })).runRestore(await this.projectPathFromSelectionOrPick(selection, true))
        });
        commands.registerCommand(CSharpKitCommands.RESTORE_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Restore solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).runRestoreSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.BUILD, {
            execute: async selection => (await this.openView({ activate: true })).runBuild(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.BUILD_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Build solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).runBuildSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.CLEAN, {
            execute: async selection => (await this.openView({ activate: true })).runClean(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.CLEAN_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Clean solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).runCleanSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.REBUILD, {
            execute: async selection => (await this.openView({ activate: true })).runRebuild(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.REBUILD_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Rebuild solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).runRebuildSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.FORMAT, {
            execute: async selection => (await this.openView({ activate: true })).formatProject(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.FORMAT_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Format solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).formatSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.PUBLISH, {
            execute: async selection => (await this.openView({ activate: true })).publishProject(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.PUBLISH_PROFILE, {
            execute: selection => this.publishProfile(selection)
        });
        commands.registerCommand(CSharpKitCommands.INIT_USER_SECRETS, {
            execute: async selection => (await this.openView({ activate: true })).initUserSecrets(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.LIST_USER_SECRETS, {
            execute: async selection => (await this.openView({ activate: true })).listUserSecrets(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.SET_USER_SECRET, {
            execute: selection => this.setUserSecret(selection)
        });
        commands.registerCommand(CSharpKitCommands.REMOVE_USER_SECRET, {
            execute: selection => this.removeUserSecret(selection)
        });
        commands.registerCommand(CSharpKitCommands.TRUST_DEV_CERTIFICATE, {
            execute: async () => (await this.openView({ activate: true })).trustDevCertificate()
        });
        commands.registerCommand(CSharpKitCommands.LIST_EF_MIGRATIONS, {
            execute: async selection => (await this.openView({ activate: true })).listEfMigrations(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.ADD_EF_MIGRATION, {
            execute: selection => this.addEfMigration(selection)
        });
        commands.registerCommand(CSharpKitCommands.UPDATE_EF_DATABASE, {
            execute: selection => this.updateEfDatabase(selection)
        });
        commands.registerCommand(CSharpKitCommands.REFRESH_DIAGNOSTICS, {
            execute: selection => this.refreshDiagnostics(selection)
        });
        commands.registerCommand(CSharpKitCommands.REFRESH_LSP_WORKSPACE_DIAGNOSTICS, {
            execute: () => this.refreshLanguageServerWorkspaceDiagnostics()
        });
        commands.registerCommand(CSharpKitCommands.LOAD_CODE_CONTEXT, {
            execute: async selection => {
                const target = await this.codeContextTargetFromSelectionOrPick(selection);
                if (target) {
                    await (await this.openView({ activate: true })).loadCodeContext(target.projectPath, target.solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.PROBE_LANGUAGE_SERVERS, {
            execute: () => this.probeLanguageServers()
        });
        commands.registerCommand(CSharpKitCommands.OPEN_ADAPTER_CONFIG, {
            execute: () => this.openAdapterConfig()
        });
        commands.registerCommand(CSharpKitCommands.RUN, {
            execute: async selection => (await this.openView({ activate: true })).runProject(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.RUN_LAUNCH_PROFILE, {
            execute: selection => this.runLaunchProfile(selection, false)
        });
        commands.registerCommand(CSharpKitCommands.OPEN_LAUNCH_URL, {
            execute: selection => this.openLaunchUrl(selection)
        });
        commands.registerCommand(CSharpKitCommands.WATCH, {
            execute: async selection => (await this.openView({ activate: true })).watchProject(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.WATCH_LAUNCH_PROFILE, {
            execute: selection => this.runLaunchProfile(selection, true)
        });
        commands.registerCommand(CSharpKitCommands.TEST, {
            execute: async selection => (await this.openView({ activate: true })).testProject(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.TEST_SOLUTION, {
            execute: async selection => {
                const solutionPath = await this.solutionPathFromSelectionOrPick(selection, 'Test solution');
                if (solutionPath) {
                    await (await this.openView({ activate: true })).testSolution(solutionPath);
                }
            }
        });
        commands.registerCommand(CSharpKitCommands.LIST_TESTS, {
            execute: async selection => (await this.openView({ activate: true })).discoverTests(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.GENERATE_WORKSPACE_FILES, {
            execute: async selection => (await this.openView({ activate: true })).generateWorkspaceFiles(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.LIST_PACKAGES, {
            execute: async selection => (await this.openView({ activate: true })).listPackages(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.LIST_PACKAGE_UPDATES, {
            execute: async selection => (await this.openView({ activate: true })).listPackageUpdates(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.LIST_PACKAGE_HEALTH, {
            execute: async selection => (await this.openView({ activate: true })).listPackageHealth(await this.projectPathFromSelectionOrPick(selection))
        });
        commands.registerCommand(CSharpKitCommands.SEARCH_PACKAGES, {
            execute: selection => this.searchPackage(selection)
        });
        commands.registerCommand(CSharpKitCommands.ADD_PACKAGE, {
            execute: selection => this.addPackage(selection)
        });
        commands.registerCommand(CSharpKitCommands.UPDATE_PACKAGE, {
            execute: selection => this.updatePackage(selection)
        });
        commands.registerCommand(CSharpKitCommands.REMOVE_PACKAGE, {
            execute: selection => this.removePackage(selection)
        });
        commands.registerCommand(CSharpKitCommands.DEBUG, {
            execute: selection => this.debugProject(selection)
        });
        commands.registerCommand(CSharpKitCommands.DEBUG_LAUNCH_PROFILE, {
            execute: selection => this.debugLaunchProfile(selection)
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        for (const command of [
            CSharpKitCommands.NEW_PROJECT,
            CSharpKitCommands.NEW_ITEM,
            CSharpKitCommands.ADD_PROJECT_TO_SOLUTION,
            CSharpKitCommands.REMOVE_PROJECT_FROM_SOLUTION,
            CSharpKitCommands.ADD_PROJECT_REFERENCE,
            CSharpKitCommands.REMOVE_PROJECT_REFERENCE,
            CSharpKitCommands.RESTORE_SOLUTION,
            CSharpKitCommands.BUILD,
            CSharpKitCommands.BUILD_SOLUTION,
            CSharpKitCommands.CLEAN,
            CSharpKitCommands.CLEAN_SOLUTION,
            CSharpKitCommands.REBUILD,
            CSharpKitCommands.REBUILD_SOLUTION,
            CSharpKitCommands.FORMAT,
            CSharpKitCommands.FORMAT_SOLUTION,
            CSharpKitCommands.PUBLISH,
            CSharpKitCommands.PUBLISH_PROFILE,
            CSharpKitCommands.INIT_USER_SECRETS,
            CSharpKitCommands.LIST_USER_SECRETS,
            CSharpKitCommands.SET_USER_SECRET,
            CSharpKitCommands.REMOVE_USER_SECRET,
            CSharpKitCommands.TRUST_DEV_CERTIFICATE,
            CSharpKitCommands.LIST_EF_MIGRATIONS,
            CSharpKitCommands.ADD_EF_MIGRATION,
            CSharpKitCommands.UPDATE_EF_DATABASE,
            CSharpKitCommands.REFRESH_DIAGNOSTICS,
            CSharpKitCommands.REFRESH_LSP_WORKSPACE_DIAGNOSTICS,
            CSharpKitCommands.LOAD_CODE_CONTEXT,
            CSharpKitCommands.PROBE_LANGUAGE_SERVERS,
            CSharpKitCommands.OPEN_ADAPTER_CONFIG,
            CSharpKitCommands.RUN,
            CSharpKitCommands.RUN_LAUNCH_PROFILE,
            CSharpKitCommands.OPEN_LAUNCH_URL,
            CSharpKitCommands.TEST,
            CSharpKitCommands.TEST_SOLUTION,
            CSharpKitCommands.DEBUG,
            CSharpKitCommands.DEBUG_LAUNCH_PROFILE,
            CSharpKitCommands.GENERATE_WORKSPACE_FILES,
            CSharpKitCommands.LIST_PACKAGE_UPDATES,
            CSharpKitCommands.LIST_PACKAGE_HEALTH,
            CSharpKitCommands.SEARCH_PACKAGES,
            CSharpKitCommands.ADD_PACKAGE,
            CSharpKitCommands.UPDATE_PACKAGE,
            CSharpKitCommands.REMOVE_PACKAGE
        ]) {
            menus.registerMenuAction(NavigatorContextMenu.NAVIGATION, {
                commandId: command.id,
                label: command.label,
                order: `9_csharp_${command.id}`
            });
        }
    }

    protected async openAdapterConfig(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before editing C# Kit adapter config.');
            return;
        }
        const result = await this.service.writeWorkspaceConfig({ workspacePath });
        await open(this.openerService, FileUri.create(result.configPath));
        this.messages.info(result.changed
            ? 'Created .cybervinci/csharp-kit.json for C# Kit adapters and sidecars.'
            : 'Opened .cybervinci/csharp-kit.json for C# Kit adapters and sidecars.');
    }

    protected async newProject(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before creating a C# project.');
            return;
        }
        const templates = await this.service.getProjectTemplates();
        const templatePick = await this.quickInputService.pick<ProjectTemplatePick>(templates.map(template => ({
            label: template.label,
            description: template.dotnetTemplate,
            detail: template.description,
            template
        })), { title: 'New C# project' });
        if (!templatePick) {
            return;
        }
        const projectName = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Project name',
            placeHolder: 'Orders.Api'
        });
        if (!projectName) {
            return;
        }
        const outputDirectory = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Parent folder relative to the workspace',
            value: templatePick.template.kind === 'test' ? 'tests' : 'src'
        });
        if (outputDirectory === undefined) {
            return;
        }
        const framework = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Target framework (optional)',
            placeHolder: 'net10.0'
        });
        if (framework === undefined) {
            return;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const solutionPick = await this.pickSolution(inspection, projectName);
        if (!solutionPick) {
            return;
        }
        const result = await this.service.createProject({
            workspacePath,
            templateId: templatePick.template.id,
            projectName,
            outputDirectory,
            framework: framework || undefined,
            solutionPath: solutionPick.solution?.path,
            createSolution: solutionPick.createSolution,
            solutionName: solutionPick.createSolution ? projectName : undefined
        });
        if (result.ok) {
            this.messages.info(`Created ${result.projectPath}${result.addedToSolution ? ' and added it to the solution' : ''}.`);
        } else {
            this.messages.error(result.rawOutput || `Failed to create ${projectName}.`);
        }
        await this.refreshVisibleWidget();
    }

    protected async newProjectItem(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const templates = await this.service.getProjectItemTemplates();
        const templatePick = await this.quickInputService.pick<ProjectItemTemplatePick>(templates.map(template => ({
            label: template.label,
            description: template.defaultDirectory,
            detail: template.description,
            template
        })), { title: 'New C# item' });
        if (!templatePick) {
            return;
        }
        const itemName = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Item name',
            placeHolder: this.defaultProjectItemName(templatePick.template.id)
        });
        if (!itemName) {
            return;
        }
        const outputDirectory = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Folder relative to the selected project',
            value: templatePick.template.defaultDirectory
        });
        if (outputDirectory === undefined) {
            return;
        }
        const namespaceName = await this.quickInputService.input({
            title: templatePick.template.label,
            prompt: 'Namespace override (optional)',
            placeHolder: 'Leave empty to derive from project and folder'
        });
        if (namespaceName === undefined) {
            return;
        }
        const result = await this.service.createProjectItem({
            workspacePath,
            projectPath,
            templateId: templatePick.template.id,
            itemName,
            outputDirectory,
            namespace: namespaceName || undefined
        });
        if (result.changed) {
            this.messages.info(`Created ${result.createdFiles.length} C# item file(s).`);
        } else {
            this.messages.warn('No files were created because the target item already exists.');
        }
        await this.refreshVisibleWidget();
    }

    protected async newSolution(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before creating a C# solution.');
            return;
        }
        const solutionName = await this.quickInputService.input({
            title: 'New C# solution',
            prompt: 'Solution name',
            placeHolder: 'Workspace'
        });
        if (!solutionName) {
            return;
        }
        const outputDirectory = await this.quickInputService.input({
            title: 'New C# solution',
            prompt: 'Parent folder relative to the workspace',
            value: '.'
        });
        if (outputDirectory === undefined) {
            return;
        }
        const result = await this.service.createSolution({
            workspacePath,
            solutionName,
            outputDirectory
        });
        this.reportCommandResult(result.commandResult);
        await this.refreshVisibleWidget();
    }

    protected async addProjectToSolution(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before editing a C# solution.');
            return;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const solution = await this.pickExistingSolution(inspection, 'Add project to solution', false);
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!solution || !projectPath) {
            return;
        }
        const result = await this.service.addProjectToSolution({ workspacePath, solutionPath: solution.path, projectPath });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected async removeProjectFromSolution(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before editing a C# solution.');
            return;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const picked = await this.pickProjectInSolution(inspection, selection);
        if (!picked) {
            return;
        }
        const result = await this.service.removeProjectFromSolution({
            workspacePath,
            solutionPath: picked.solution.path,
            projectPath: picked.projectPath
        });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected async addProjectReference(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const project = inspection.projects.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(projectPath));
        const picked = await this.quickInputService.pick<ProjectPick>(inspection.projects
            .filter(candidate => this.normalizePath(candidate.path) !== this.normalizePath(projectPath))
            .map(candidate => ({
                label: candidate.name,
                description: candidate.kind,
                detail: candidate.path,
                project: candidate
            })), { title: `Reference project from ${project?.name ?? 'project'}` });
        if (!picked) {
            return;
        }
        const result = await this.service.addProjectReference({
            workspacePath,
            projectPath,
            referenceProjectPath: picked.project.path
        });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected async removeProjectReference(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const project = inspection.projects.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(projectPath));
        if (!project || project.projectReferences.length === 0) {
            this.messages.warn('The selected C# project has no project references.');
            return;
        }
        const picked = await this.quickInputService.pick(project.projectReferences.map(reference => ({
            label: reference.path,
            detail: this.resolveProjectReferencePath(project, reference.path),
            referencePath: this.resolveProjectReferencePath(project, reference.path)
        })), { title: `Remove reference from ${project.name}` });
        if (!picked) {
            return;
        }
        const result = await this.service.removeProjectReference({
            workspacePath,
            projectPath,
            referenceProjectPath: picked.referencePath
        });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected async refreshDiagnostics(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        await this.diagnostics.refreshDiagnostics({ workspacePath, projectPath });
    }

    protected async refreshLanguageServerWorkspaceDiagnostics(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before refreshing C# language-server workspace diagnostics.');
            return;
        }
        await this.diagnostics.refreshLanguageServerWorkspaceDiagnostics(workspacePath);
    }

    protected async probeLanguageServers(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before probing C# language servers.');
            return;
        }
        const result = await this.service.probeLanguageServers({ workspacePath });
        const initialized = result.probes.filter(probe => probe.ok);
        const failed = result.probes.filter(probe => !probe.ok);
        if (initialized.length) {
            this.messages.info(`C# Kit initialized ${initialized.map(probe => `${probe.label}${probe.serverName ? ` (${probe.serverName})` : ''}`).join(', ')}.`);
        }
        if (failed.length) {
            this.messages.warn(`C# Kit language server probe warnings: ${failed.map(probe => `${probe.label}: ${probe.detail}`).join(' | ')}`);
        }
    }

    protected async runLaunchProfile(selection: unknown, watch: boolean): Promise<void> {
        const picked = await this.pickLaunchProfile(selection, watch ? 'Watch launch profile' : 'Run launch profile', 'dotnet');
        if (!picked) {
            return;
        }
        const widget = await this.openView({ activate: true });
        if (watch) {
            await widget.watchProject(picked.project.path, picked.profileName);
        } else {
            await widget.runProject(picked.project.path, picked.profileName);
        }
    }

    protected async openLaunchUrl(selection: unknown): Promise<void> {
        const picked = await this.pickLaunchUrl(selection);
        if (!picked) {
            return;
        }
        try {
            await this.commandService.executeCommand(MINI_BROWSER_OPEN_URL_COMMAND, picked.url);
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected async publishProfile(selection: unknown): Promise<void> {
        const picked = await this.pickPublishProfile(selection);
        if (!picked) {
            return;
        }
        await (await this.openView({ activate: true })).publishProjectProfile(picked.project.path, picked.profileName);
    }

    protected async pickLaunchUrl(selection: unknown): Promise<LaunchUrlPick | undefined> {
        const workspacePath = await this.workspacePath();
        const selectedProjectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !selectedProjectPath) {
            return undefined;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const project = inspection.projects.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(selectedProjectPath));
        if (!project) {
            this.messages.warn('No C# project was selected.');
            return undefined;
        }
        const picks = project.launchProfiles.flatMap(profile => this.launchProfileUrls(profile).map(url => ({
            label: `${profile.name}: ${url}`,
            description: profile.commandName ?? 'Project',
            detail: profile.launchUrl ? `launchUrl: ${profile.launchUrl}` : profile.applicationUrl,
            project,
            profileName: profile.name,
            url
        })));
        if (!picks.length) {
            this.messages.warn('The selected C# project has no launchSettings URL to open.');
            return undefined;
        }
        if (picks.length === 1) {
            return picks[0];
        }
        return this.quickInputService.pick<LaunchUrlPick>(picks, { title: 'Open launch URL' });
    }

    protected async pickPublishProfile(selection: unknown): Promise<PublishProfilePick | undefined> {
        const workspacePath = await this.workspacePath();
        const selectedProjectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !selectedProjectPath) {
            return undefined;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const project = inspection.projects.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(selectedProjectPath));
        const profiles = project?.publishProfiles ?? [];
        if (!project || profiles.length === 0) {
            this.messages.warn('The selected C# project has no .pubxml publish profiles.');
            return undefined;
        }
        if (profiles.length === 1) {
            return {
                label: profiles[0].name,
                project,
                profileName: profiles[0].name
            };
        }
        return this.quickInputService.pick<PublishProfilePick>(profiles.map(profile => ({
            label: profile.name,
            description: profile.publishProtocol ?? profile.webPublishMethod,
            detail: [profile.lastUsedBuildConfiguration, profile.targetFramework, profile.runtimeIdentifier, profile.publishUrl ?? profile.publishDir].filter(Boolean).join(' | '),
            project,
            profileName: profile.name
        })), { title: 'Publish profile' });
    }

    protected launchProfileUrls(profile: CSharpProjectSummary['launchProfiles'][number]): string[] {
        if (profile.browserUrl) {
            return [profile.browserUrl];
        }
        const baseUrls = profile.applicationUrls ?? profile.applicationUrl?.split(';').map(item => item.trim()).filter(Boolean) ?? [];
        return baseUrls.map(baseUrl => this.withLaunchUrl(baseUrl, profile.launchUrl));
    }

    protected withLaunchUrl(baseUrl: string, launchUrl: string | undefined): string {
        if (!launchUrl) {
            return baseUrl;
        }
        if (/^https?:\/\//i.test(launchUrl)) {
            return launchUrl;
        }
        return `${baseUrl.replace(/\/+$/, '')}/${launchUrl.replace(/^\/+/, '')}`;
    }

    protected async pickSolution(inspection: CSharpWorkspaceInspection, projectName: string): Promise<SolutionPick | undefined> {
        const picks: SolutionPick[] = [
            {
                label: 'Do not add to a solution',
                detail: 'Create only the project folder.'
            },
            {
                label: `Create ${projectName}.sln`,
                detail: 'Create a new solution in the workspace root and add the project.',
                createSolution: true
            },
            ...inspection.solutions.filter(solution => solution.format !== 'slnf').map(solution => ({
                label: solution.name,
                description: solution.format,
                detail: solution.path,
                solution
            }))
        ];
        return this.quickInputService.pick<SolutionPick>(picks, { title: 'Solution' });
    }

    protected async pickLaunchProfile(selection: unknown, title: string, mode: 'dotnet' | 'debug' = 'dotnet'): Promise<LaunchProfilePick | undefined> {
        const workspacePath = await this.workspacePath();
        const selectedProjectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !selectedProjectPath) {
            return undefined;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const project = inspection.projects.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(selectedProjectPath));
        const profiles = project?.launchProfiles.filter(profile => this.isLaunchProfileSupported(profile, mode)) ?? [];
        if (!project || profiles.length === 0) {
            this.messages.warn(mode === 'debug'
                ? 'The selected C# project has no launchSettings.json Project or Executable profiles.'
                : 'The selected C# project has no launchSettings.json Project profiles.');
            return undefined;
        }
        if (profiles.length === 1) {
            return {
                label: profiles[0].name,
                project,
                profileName: profiles[0].name
            };
        }
        return this.quickInputService.pick<LaunchProfilePick>(profiles.map(profile => ({
            label: profile.name,
            description: profile.commandName ?? 'Project',
            detail: [profile.applicationUrl, profile.executablePath, profile.commandLineArgs].filter(Boolean).join(' | '),
            project,
            profileName: profile.name
        })), { title });
    }

    protected isLaunchProfileSupported(profile: CSharpWorkspaceInspection['projects'][number]['launchProfiles'][number], mode: 'dotnet' | 'debug'): boolean {
        if (!profile.commandName || profile.commandName === 'Project') {
            return true;
        }
        return mode === 'debug' && profile.commandName === 'Executable' && !!profile.executablePath;
    }

    protected async pickExistingSolution(inspection: CSharpWorkspaceInspection, title: string, includeFilters = true): Promise<CSharpSolutionSummary | undefined> {
        const solutions = includeFilters ? inspection.solutions : inspection.solutions.filter(solution => solution.format !== 'slnf');
        if (solutions.length === 0) {
            this.messages.warn(includeFilters
                ? 'No .sln, .slnx or .slnf file detected in this workspace.'
                : 'No editable .sln or .slnx file detected in this workspace.');
            return undefined;
        }
        if (solutions.length === 1) {
            return solutions[0];
        }
        const picked = await this.quickInputService.pick<SolutionPick>(solutions.map(solution => ({
            label: solution.name,
            description: solution.format,
            detail: solution.path,
            solution
        })), { title });
        return picked?.solution;
    }

    protected async pickProjectInSolution(inspection: CSharpWorkspaceInspection, selection: unknown): Promise<SolutionProjectPick | undefined> {
        const selectedProjectPath = await this.projectPathFromSelectionOrPick(selection);
        const selectedNormalized = selectedProjectPath ? this.normalizePath(selectedProjectPath) : undefined;
        const picks = inspection.solutions.filter(solution => solution.format !== 'slnf').flatMap(solution => solution.projectPaths
            .filter(projectPath => !selectedNormalized || this.normalizePath(projectPath) === selectedNormalized)
            .map(projectPath => ({
                label: this.projectLabelFromPath(projectPath, inspection),
                description: solution.name,
                detail: projectPath,
                solution,
                projectPath
        })));
        if (picks.length === 0) {
            this.messages.warn('No project entry was found in an editable .sln or .slnx solution.');
            return undefined;
        }
        if (picks.length === 1) {
            return picks[0];
        }
        return this.quickInputService.pick<SolutionProjectPick>(picks, { title: 'Remove project from solution' });
    }

    protected async debugProject(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const result = await this.service.writeWorkspaceFiles({
            workspacePath,
            projectPath,
            overwrite: true
        });
        await this.debugConfigurationManager.load();
        const options = Array.from(this.debugConfigurationManager.all)
            .find(candidate => this.debugConfigurationName(candidate) === result.launchConfigurationName);
        if (!options) {
            this.messages.info(`Generated ${result.launchConfigurationName}. Run it from the Debug view if it is not visible until the next configuration refresh.`);
            return;
        }
        try {
            const session = await this.debugSessionManager.start(options);
            if (!session) {
                this.messages.warn(`Could not start ${result.launchConfigurationName}. Verify that a coreclr debug adapter is installed.`);
            }
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected async debugLaunchProfile(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const picked = await this.pickLaunchProfile(selection, 'Debug launch profile', 'debug');
        if (!workspacePath || !picked) {
            return;
        }
        const result = await this.service.writeWorkspaceFiles({
            workspacePath,
            projectPath: picked.project.path,
            overwrite: true
        });
        await this.debugConfigurationManager.load();
        const configurationName = `C# Kit: Debug ${picked.project.name} (${picked.profileName})`;
        const options = Array.from(this.debugConfigurationManager.all)
            .find(candidate => this.debugConfigurationName(candidate) === configurationName);
        if (!options) {
            this.messages.info(`Generated ${configurationName}. Run it from the Debug view if it is not visible until the next configuration refresh.`);
            return;
        }
        try {
            const session = await this.debugSessionManager.start(options);
            if (!session) {
                this.messages.warn(`Could not start ${configurationName}. Verify that a coreclr debug adapter is installed.`);
            }
        } catch (error) {
            this.messages.error(error instanceof Error ? error.message : String(error));
        }
        if (!result.launchConfigurationNames.includes(configurationName)) {
            this.messages.warn(`Generated launch files, but ${configurationName} was not included.`);
        }
    }

    protected async addPackage(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const packageId = await this.quickInputService.input({ placeHolder: 'NuGet package id' });
        if (!packageId) {
            return;
        }
        const version = await this.quickInputService.input({ placeHolder: 'Version constraint (optional)' });
        const result = await this.service.addPackage({
            workspacePath,
            projectPath,
            packageId,
            version: version || undefined
        });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected async setUserSecret(selection: unknown): Promise<void> {
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!projectPath) {
            return;
        }
        const key = await this.quickInputService.input({
            title: 'Set user secret',
            prompt: 'Secret key',
            placeHolder: 'ConnectionStrings:Default'
        });
        if (!key) {
            return;
        }
        const value = await this.quickInputService.input({
            title: 'Set user secret',
            prompt: 'Secret value',
            placeHolder: 'Value is sent to dotnet user-secrets'
        });
        if (value === undefined) {
            return;
        }
        await (await this.openView({ activate: true })).setUserSecret(projectPath, key, value);
    }

    protected async removeUserSecret(selection: unknown): Promise<void> {
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!projectPath) {
            return;
        }
        const key = await this.quickInputService.input({
            title: 'Remove user secret',
            prompt: 'Secret key',
            placeHolder: 'ConnectionStrings:Default'
        });
        if (!key) {
            return;
        }
        await (await this.openView({ activate: true })).removeUserSecret(projectPath, key);
    }

    protected async addEfMigration(selection: unknown): Promise<void> {
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!projectPath) {
            return;
        }
        const migrationName = await this.quickInputService.input({
            title: 'Add EF Core migration',
            prompt: 'Migration name',
            placeHolder: 'InitialCreate'
        });
        if (!migrationName) {
            return;
        }
        const dbContext = await this.quickInputService.input({
            title: 'Add EF Core migration',
            prompt: 'DbContext name (optional)',
            placeHolder: 'Leave empty to let dotnet ef choose'
        });
        if (dbContext === undefined) {
            return;
        }
        await (await this.openView({ activate: true })).addEfMigration(projectPath, migrationName, dbContext || undefined);
    }

    protected async updateEfDatabase(selection: unknown): Promise<void> {
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!projectPath) {
            return;
        }
        const migrationName = await this.quickInputService.input({
            title: 'Update EF Core database',
            prompt: 'Target migration (optional)',
            placeHolder: 'Leave empty for latest migration'
        });
        if (migrationName === undefined) {
            return;
        }
        const dbContext = await this.quickInputService.input({
            title: 'Update EF Core database',
            prompt: 'DbContext name (optional)',
            placeHolder: 'Leave empty to let dotnet ef choose'
        });
        if (dbContext === undefined) {
            return;
        }
        await (await this.openView({ activate: true })).updateEfDatabase(projectPath, migrationName || undefined, dbContext || undefined);
    }

    protected async searchPackage(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const query = await this.quickInputService.input({
            title: 'Search NuGet packages',
            prompt: 'Package search',
            placeHolder: 'Newtonsoft.Json'
        });
        if (!query) {
            return;
        }
        const result = await this.service.searchPackages({ workspacePath, query, take: 20 });
        if (!result.packages.length) {
            this.messages.warn(`No NuGet packages found for "${query}".`);
            return;
        }
        const picked = await this.quickInputService.pick<NuGetPackagePick>(result.packages.map(pkg => ({
            label: pkg.id,
            description: pkg.version,
            detail: pkg.description,
            package: pkg
        })), { title: 'Install NuGet package' });
        if (!picked) {
            return;
        }
        const install = await this.service.addPackage({
            workspacePath,
            projectPath,
            packageId: picked.package.id,
            version: picked.package.version
        });
        this.reportCommandResult(install);
        await this.refreshVisibleWidget();
    }

    protected async updatePackage(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const updates = await this.service.listPackageUpdates({ workspacePath, projectPath });
        const directUpdates = updates.updates.filter(update => !update.transitive && update.latestVersion);
        if (directUpdates.length) {
            const pickedUpdate = await this.quickInputService.pick<NuGetUpdatePick>(directUpdates.map(update => ({
                label: update.id,
                description: update.latestVersion,
                detail: `${update.resolvedVersion ?? update.requestedVersion ?? 'installed'} -> ${update.latestVersion}${update.framework ? ` (${update.framework})` : ''}`,
                update
            })), { title: 'Update NuGet package' });
            if (!pickedUpdate) {
                return;
            }
            const update = await this.service.updatePackage({
                workspacePath,
                projectPath,
                packageId: pickedUpdate.update.id,
                version: pickedUpdate.update.latestVersion
            });
            this.reportCommandResult(update);
            await this.refreshVisibleWidget();
            return;
        }
        const listed = await this.service.listPackages({ workspacePath, projectPath });
        const directPackages = listed.packages.filter(pkg => !pkg.transitive);
        if (!directPackages.length) {
            this.messages.warn('The selected C# project has no direct NuGet package references.');
            return;
        }
        const picked = await this.quickInputService.pick(directPackages.map(pkg => ({
            label: pkg.id,
            description: pkg.version,
            packageId: pkg.id
        })), { title: 'Update NuGet package' });
        if (!picked) {
            return;
        }
        const search = await this.service.searchPackages({ workspacePath, query: picked.packageId, take: 10 });
        const latest = search.packages.find(pkg => pkg.id.toLowerCase() === picked.packageId.toLowerCase()) ?? search.packages[0];
        const update = await this.service.updatePackage({
            workspacePath,
            projectPath,
            packageId: picked.packageId,
            version: latest?.version
        });
        this.reportCommandResult(update);
        await this.refreshVisibleWidget();
    }

    protected async removePackage(selection: unknown): Promise<void> {
        const workspacePath = await this.workspacePath();
        const projectPath = await this.projectPathFromSelectionOrPick(selection);
        if (!workspacePath || !projectPath) {
            return;
        }
        const listed = await this.service.listPackages({ workspacePath, projectPath });
        const picked = listed.packages.length
            ? await this.quickInputService.pick(listed.packages.map(pkg => ({
                label: pkg.id,
                description: pkg.version,
                packageId: pkg.id
            })), { title: 'Remove NuGet package' })
            : undefined;
        const packageId = picked?.packageId ?? await this.quickInputService.input({ placeHolder: 'NuGet package id' });
        if (!packageId) {
            return;
        }
        const result = await this.service.removePackage({ workspacePath, projectPath, packageId });
        this.reportCommandResult(result);
        await this.refreshVisibleWidget();
    }

    protected defaultProjectItemName(templateId: CSharpProjectItemTemplate['id']): string {
        switch (templateId) {
            case 'class':
                return 'OrderService';
            case 'interface':
                return 'IOrderService';
            case 'record':
                return 'OrderDto';
            case 'enum':
                return 'OrderStatus';
            case 'controller':
                return 'Orders';
            case 'razor-page':
                return 'Orders';
            case 'xunit-test':
            case 'nunit-test':
            case 'mstest-test':
                return 'OrderServiceTests';
            default:
                return 'NewItem';
        }
    }

    protected async projectPathFromSelectionOrPick(selection: unknown, allowWorkspaceRestore = false): Promise<string | undefined> {
        if (typeof selection === 'string' && isCSharpProjectFileName(selection)) {
            return selection;
        }
        const selected = this.selectedProjectUri(selection ?? this.selectionService.selection);
        if (selected) {
            return FileUri.fsPath(selected.toString());
        }
        const widgetProject = this.tryGetWidget()?.getInspection()?.projects[0];
        if (widgetProject && allowWorkspaceRestore) {
            return widgetProject.path;
        }
        const inspection = await this.inspectWorkspace();
        if (!inspection) {
            return undefined;
        }
        if (inspection.projects.length === 0) {
            this.messages.warn('No C# project detected in this workspace.');
            return undefined;
        }
        if (inspection.projects.length === 1) {
            return inspection.projects[0].path;
        }
        const picked = await this.quickInputService.pick<ProjectPick>(inspection.projects.map(project => ({
            label: project.name,
            description: project.kind,
            detail: project.path,
            project
        })), { title: 'Select C# project' });
        return picked?.project.path;
    }

    protected async solutionPathFromSelectionOrPick(selection: unknown, title: string): Promise<string | undefined> {
        if (typeof selection === 'string' && isCSharpSolutionFileName(selection)) {
            return selection;
        }
        const selected = this.selectedSolutionUri(selection ?? this.selectionService.selection);
        if (selected) {
            return FileUri.fsPath(selected.toString());
        }
        const inspection = await this.inspectWorkspace();
        if (!inspection) {
            return undefined;
        }
        const solution = await this.pickExistingSolution(inspection, title);
        return solution?.path;
    }

    protected async codeContextTargetFromSelectionOrPick(selection: unknown): Promise<CodeContextTarget | undefined> {
        const options = this.asCodeContextCommandOptions(selection);
        if (options) {
            if (options.solutionOnly) {
                const solutionPath = options.solutionPath ?? await this.solutionPathFromSelectionOrPick(undefined, 'Build AI/Memory context for solution');
                return solutionPath ? { solutionPath } : undefined;
            }
            if (options.solutionPath) {
                return { solutionPath: options.solutionPath };
            }
            if (options.projectPath) {
                return { projectPath: options.projectPath };
            }
        }
        const selected = selection ?? this.selectionService.selection;
        if (typeof selected === 'string') {
            if (isCSharpSolutionFileName(selected)) {
                return { solutionPath: selected };
            }
            if (isCSharpProjectFileName(selected)) {
                return { projectPath: selected };
            }
        }
        const selectedSolution = this.selectedSolutionUri(selected);
        if (selectedSolution) {
            return { solutionPath: FileUri.fsPath(selectedSolution.toString()) };
        }
        const selectedProject = this.selectedProjectUri(selected);
        if (selectedProject) {
            return { projectPath: FileUri.fsPath(selectedProject.toString()) };
        }
        const inspection = await this.inspectWorkspace();
        if (!inspection) {
            return undefined;
        }
        const targets: CodeContextTargetPick[] = [
            ...inspection.solutions.map(solution => ({
                label: solution.name,
                description: solution.format.toUpperCase(),
                detail: solution.path,
                target: { solutionPath: solution.path }
            })),
            ...inspection.projects.map(project => ({
                label: project.name,
                description: project.kind,
                detail: project.path,
                target: { projectPath: project.path }
            }))
        ];
        if (targets.length === 0) {
            this.messages.warn('No C# solution, solution filter or project detected in this workspace.');
            return undefined;
        }
        if (targets.length === 1) {
            return targets[0].target;
        }
        const picked = await this.quickInputService.pick<CodeContextTargetPick>(targets, { title: 'Build AI/Memory context' });
        return picked?.target;
    }

    protected asCodeContextCommandOptions(value: unknown): CodeContextCommandOptions | undefined {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.solutionOnly !== 'boolean' && typeof candidate.solutionPath !== 'string' && typeof candidate.projectPath !== 'string') {
            return undefined;
        }
        return {
            solutionOnly: typeof candidate.solutionOnly === 'boolean' ? candidate.solutionOnly : undefined,
            solutionPath: typeof candidate.solutionPath === 'string' ? candidate.solutionPath : undefined,
            projectPath: typeof candidate.projectPath === 'string' ? candidate.projectPath : undefined
        };
    }

    protected projectLabelFromPath(projectPath: string, inspection: CSharpWorkspaceInspection): string {
        return inspection.projects.find(project => this.normalizePath(project.path) === this.normalizePath(projectPath))?.name
            ?? projectPath.replace(/\\/g, '/').split('/').pop()
            ?? projectPath;
    }

    protected resolveProjectReferencePath(project: CSharpProjectSummary, referencePath: string): string {
        if (/^[A-Za-z]:[\\/]/.test(referencePath) || referencePath.startsWith('/') || referencePath.startsWith('\\')) {
            return referencePath;
        }
        const separator = project.path.includes('\\') ? '\\' : '/';
        const projectDirectory = project.path.replace(/[\\/][^\\/]+$/, '');
        return `${projectDirectory}${separator}${referencePath}`;
    }

    protected normalizePath(value: string): string {
        return value.replace(/\\/g, '/').toLowerCase();
    }

    protected selectedProjectUri(selection: unknown): URI | undefined {
        const uri = UriSelection.getUri(selection);
        if (uri && isCSharpProjectFileName(uri.path.toString())) {
            return uri;
        }
        return undefined;
    }

    protected selectedSolutionUri(selection: unknown): URI | undefined {
        const uri = UriSelection.getUri(selection);
        if (uri && isCSharpSolutionFileName(uri.path.toString())) {
            return uri;
        }
        return undefined;
    }

    protected async inspectWorkspace(): Promise<CSharpWorkspaceInspection | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before using C# Kit.');
            return undefined;
        }
        return this.service.inspectWorkspace({ workspacePath });
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected debugConfigurationName(options: DebugSessionOptions): string {
        if (DebugSessionOptions.isConfiguration(options)) {
            return options.configuration.name;
        }
        if (DebugSessionOptions.isCompound(options)) {
            return options.compound.name;
        }
        return '';
    }

    protected reportCommandResult(result: { ok: boolean; command: string; stdout: string; stderr: string }): void {
        if (result.ok) {
            this.messages.info(`Completed: ${result.command}`);
        } else {
            this.messages.error(result.stderr || result.stdout || `Failed: ${result.command}`);
        }
    }

    protected async refreshVisibleWidget(): Promise<void> {
        const widget = this.tryGetWidget();
        if (widget) {
            await widget.refresh();
        }
    }

    canHandle(uri: URI | undefined): number {
        return uri && isCSharpSourceFileName(uri.path.toString()) ? 50 : 0;
    }
}

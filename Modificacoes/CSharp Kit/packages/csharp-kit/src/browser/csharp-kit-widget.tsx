import { FileUri } from '@theia/core/lib/common/file-uri';
import { CommandService, MessageService } from '@theia/core/lib/common';
import { ReactWidget, codicon } from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    CSharpCapability,
    CSharpCodeContextResult,
    CSharpDotnetToolManifestSummary,
    CSharpEditorConfigSummary,
    CSharpKitCommands,
    CSharpKitService,
    CSharpNuGetConfigSummary,
    CSharpPackageHealthIssue,
    CSharpPackageReference,
    CSharpPackageUpdate,
    CSharpProjectFile,
    CSharpProjectSummary,
    CSharpRazorFileSummary,
    CSharpRunSettingsSummary,
    CSharpSemanticInventoryResult,
    CSharpSolutionSummary,
    CSharpTestCase,
    CSharpWorkspaceInspection
} from '../common';
import { CSharpKitTerminalService } from './csharp-kit-terminal-service';

@injectable()
export class CSharpKitWidget extends ReactWidget {
    static readonly ID = 'cybervinci.csharp-kit.widget';
    static readonly LABEL = 'C# Kit';

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(CSharpKitTerminalService)
    protected readonly terminal: CSharpKitTerminalService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    protected loading = false;
    protected error: string | undefined;
    protected inspection: CSharpWorkspaceInspection | undefined;
    protected selectedProjectPath: string | undefined;
    protected tests: CSharpTestCase[] = [];
    protected packages: CSharpPackageReference[] = [];
    protected packageUpdates: CSharpPackageUpdate[] = [];
    protected packageHealthIssues: CSharpPackageHealthIssue[] = [];
    protected semanticInventory: CSharpSemanticInventoryResult | undefined;
    protected codeContext: CSharpCodeContextResult | undefined;
    protected lastOutput = '';

    @postConstruct()
    protected init(): void {
        this.id = CSharpKitWidget.ID;
        this.title.label = CSharpKitWidget.LABEL;
        this.title.caption = 'CyberVinci C#/.NET Kit';
        this.title.iconClass = codicon('symbol-class');
        this.title.closable = true;
        this.addClass('cv-csharp-kit-widget');
        this.refresh().catch(error => this.setError(error));
    }

    getInspection(): CSharpWorkspaceInspection | undefined {
        return this.inspection;
    }

    async refresh(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.inspection = undefined;
            this.error = 'Open a workspace before using C# Kit.';
            this.update();
            return;
        }
        this.loading = true;
        this.error = undefined;
        this.update();
        try {
            this.inspection = await this.service.inspectWorkspace({ workspacePath });
            if (!this.selectedProjectPath || !this.inspection.projects.some(project => project.path === this.selectedProjectPath)) {
                this.selectedProjectPath = this.inspection.projects[0]?.path;
            }
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async runRestore(projectPath?: string): Promise<void> {
        await this.runDotnet('restore', projectPath, projectPath ? ['restore', projectPath] : ['restore']);
    }

    async runRestoreSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        await this.runDotnet(`restore ${solution.name}`, undefined, this.solutionRestoreArgs(solution));
    }

    async runBuild(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('build', project.path, ['build', project.path, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
    }

    async runBuildSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        await this.runDotnet(`build ${solution.name}`, undefined, this.solutionBuildArgs(solution));
    }

    async runClean(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('clean', project.path, ['clean', project.path]);
    }

    async runCleanSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        await this.runDotnet(`clean ${solution.name}`, undefined, this.solutionCleanArgs(solution));
    }

    async runRebuild(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('rebuild', project.path, ['msbuild', project.path, '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
    }

    async runRebuildSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        await this.runDotnet(`rebuild ${solution.name}`, undefined, ['msbuild', solution.path, '/t:Rebuild', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
    }

    async formatProject(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('format', project.path, ['format', project.path]);
    }

    async formatSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        if (solution.format === 'slnf') {
            this.messages.warn('C# Kit does not run dotnet format against .slnf filters; format the projects or the source solution instead.');
            return;
        }
        await this.runDotnet(`format ${solution.name}`, undefined, ['format', solution.path]);
    }

    async publishProject(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('publish', project.path, ['publish', project.path, '--configuration', 'Release', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
    }

    async publishProjectProfile(projectPath: string | undefined, profileName: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet(`publish ${profileName}`, project.path, ['publish', project.path, `/p:PublishProfile=${profileName}`, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
    }

    async initUserSecrets(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        await this.runDotnet('user-secrets init', project.path, ['user-secrets', 'init', '--project', project.path]);
    }

    async listUserSecrets(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingUserSecrets(project);
        await this.runDotnet('user-secrets list', project.path, ['user-secrets', 'list', '--project', project.path]);
    }

    async setUserSecret(projectPath: string | undefined, key: string, value: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingUserSecrets(project);
        await this.runDotnet(`user-secrets set ${key}`, project.path, ['user-secrets', 'set', key, value, '--project', project.path]);
    }

    async removeUserSecret(projectPath: string | undefined, key: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingUserSecrets(project);
        await this.runDotnet(`user-secrets remove ${key}`, project.path, ['user-secrets', 'remove', key, '--project', project.path]);
    }

    async trustDevCertificate(): Promise<void> {
        await this.runDotnet('dev-certs https trust', undefined, ['dev-certs', 'https', '--trust']);
    }

    async listEfMigrations(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingEntityFramework(project);
        await this.runDotnet('ef migrations list', project.path, ['ef', 'migrations', 'list', '--project', project.path]);
    }

    async addEfMigration(projectPath: string | undefined, migrationName: string, dbContext?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingEntityFramework(project);
        const args = ['ef', 'migrations', 'add', migrationName, '--project', project.path];
        if (dbContext) {
            args.push('--context', dbContext);
        }
        await this.runDotnet(`ef migration ${migrationName}`, project.path, args);
    }

    async updateEfDatabase(projectPath?: string, migrationName?: string, dbContext?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        this.warnIfMissingEntityFramework(project);
        const args = ['ef', 'database', 'update'];
        if (migrationName) {
            args.push(migrationName);
        }
        args.push('--project', project.path);
        if (dbContext) {
            args.push('--context', dbContext);
        }
        await this.runDotnet(migrationName ? `ef database update ${migrationName}` : 'ef database update', project.path, args);
    }

    async runProject(projectPath?: string, launchProfileName?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        const args = ['run', '--project', project.path];
        if (launchProfileName) {
            args.push('--launch-profile', launchProfileName);
        }
        await this.runDotnet(launchProfileName ? `run ${launchProfileName}` : 'run', project.path, args);
    }

    async watchProject(projectPath?: string, launchProfileName?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        const args = ['watch', '--project', project.path, 'run'];
        if (launchProfileName) {
            args.push('--launch-profile', launchProfileName);
        }
        await this.runDotnet(launchProfileName ? `watch ${launchProfileName}` : 'watch', project.path, args);
    }

    async testProject(projectPath?: string): Promise<void> {
        const project = this.requireProject(projectPath);
        if (!project) {
            return;
        }
        const runner = this.dotnetTestRunnerForTarget(project.path);
        await this.runDotnet('test', project.path, [
            ...this.dotnetTestTargetArgs(project.path, 'project', runner),
            ...this.dotnetTestConsoleArgs(runner)
        ]);
    }

    async testSolution(solutionPath?: string): Promise<void> {
        const solution = this.requireSolution(solutionPath);
        if (!solution) {
            return;
        }
        if (solution.format === 'slnf') {
            this.messages.warn('C# Kit does not run dotnet test against .slnf filters; run tests from the included projects or the source solution instead.');
            return;
        }
        const runner = this.dotnetTestRunnerForTarget(solution.path);
        await this.runDotnet(`test ${solution.name}`, undefined, [
            ...this.dotnetTestTargetArgs(solution.path, 'solution', runner),
            ...this.dotnetTestConsoleArgs(runner)
        ]);
    }

    async discoverTests(projectPath?: string): Promise<void> {
        const workspacePath = await this.workspacePath();
        const project = this.requireProject(projectPath);
        if (!workspacePath || !project) {
            return;
        }
        this.loading = true;
        this.update();
        try {
            const result = await this.service.discoverTests({ workspacePath, projectPath: project.path });
            this.tests = result.tests;
            this.lastOutput = result.rawOutput;
            this.messages.info(`Discovered ${result.tests.length} test(s) in ${project.name}.`);
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async listPackages(projectPath?: string): Promise<void> {
        const workspacePath = await this.workspacePath();
        const project = this.requireProject(projectPath);
        if (!workspacePath || !project) {
            return;
        }
        this.loading = true;
        this.update();
        try {
            const result = await this.service.listPackages({ workspacePath, projectPath: project.path });
            this.packages = result.packages;
            this.lastOutput = result.rawOutput;
            this.messages.info(`Loaded ${result.packages.length} package reference(s) for ${project.name}.`);
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async listPackageUpdates(projectPath?: string): Promise<void> {
        const workspacePath = await this.workspacePath();
        const project = this.requireProject(projectPath);
        if (!workspacePath || !project) {
            return;
        }
        this.loading = true;
        this.update();
        try {
            const result = await this.service.listPackageUpdates({ workspacePath, projectPath: project.path });
            this.packageUpdates = result.updates;
            this.lastOutput = result.rawOutput;
            if (result.updates.length) {
                this.messages.info(`Found ${result.updates.length} NuGet update(s) for ${project.name}.`);
            } else {
                this.messages.info(`No NuGet updates found for ${project.name}.`);
            }
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async listPackageHealth(projectPath?: string): Promise<void> {
        const workspacePath = await this.workspacePath();
        const project = this.requireProject(projectPath);
        if (!workspacePath || !project) {
            return;
        }
        this.loading = true;
        this.update();
        try {
            const result = await this.service.listPackageHealth({ workspacePath, projectPath: project.path });
            this.packageHealthIssues = result.issues;
            this.lastOutput = result.rawOutput;
            if (result.issues.length) {
                this.messages.warn(`Found ${result.issues.length} NuGet audit issue(s) for ${project.name}.`);
            } else {
                this.messages.info(`No vulnerable or deprecated NuGet packages found for ${project.name}.`);
            }
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async loadSemanticInventory(): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn('Open a workspace before loading Roslyn semantic inventory.');
            return;
        }
        this.loading = true;
        this.update();
        try {
            const result = await this.service.getSemanticInventory({ workspacePath });
            this.semanticInventory = result;
            this.lastOutput = result.diagnostics.map(diagnostic => `${diagnostic.id}: ${diagnostic.message}`).join('\n');
            if (result.mode === 'semantic') {
                this.messages.info(result.detail);
            } else {
                this.messages.warn(result.detail);
            }
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async loadCodeContext(projectPath?: string, solutionPath?: string): Promise<void> {
        const workspacePath = await this.workspacePath();
        const solution = solutionPath ? this.requireSolution(solutionPath) : undefined;
        const project = solution ? undefined : this.requireProject(projectPath);
        if (!workspacePath || (!project && !solution)) {
            return;
        }
        await this.loadResolvedCodeContext(workspacePath, {
            projectPath: project?.path,
            solutionPath: solution?.path
        });
    }

    protected async loadResolvedCodeContext(workspacePath: string, target: { projectPath?: string; solutionPath?: string }): Promise<void> {
        this.loading = true;
        this.update();
        try {
            const result = await this.service.getCodeContext({
                workspacePath,
                projectPath: target.projectPath,
                solutionPath: target.solutionPath
            });
            this.codeContext = result;
            this.lastOutput = result.prompt;
            this.messages.info(result.summary);
        } catch (error) {
            this.setError(error);
        } finally {
            this.loading = false;
            this.update();
        }
    }

    async generateWorkspaceFiles(projectPath?: string, overwrite = true): Promise<void> {
        const workspacePath = await this.workspacePath();
        const project = this.requireProject(projectPath);
        if (!workspacePath || !project) {
            return;
        }
        try {
            const result = await this.service.writeWorkspaceFiles({
                workspacePath,
                projectPath: project.path,
                overwrite
            });
            this.messages.info(`Generated ${result.launchConfigurationNames.length} launch configuration(s), ${result.taskLabels.length} task(s)${result.configChanged ? ' and C# Kit config' : ''}.`);
        } catch (error) {
            this.setError(error);
        }
    }

    protected async runDotnet(action: string, projectPath: string | undefined, args: string[]): Promise<void> {
        const cwd = await this.workspacePath();
        if (!cwd) {
            this.messages.warn('Open a workspace before running dotnet commands.');
            return;
        }
        const projectName = projectPath ? this.projectByPath(projectPath)?.name : undefined;
        await this.terminal.runDotnet(cwd, args, `C# Kit: ${action}${projectName ? ` ${projectName}` : ''}`);
    }

    protected requireProject(projectPath?: string): CSharpProjectSummary | undefined {
        const project = projectPath ? this.projectByPath(projectPath) : this.selectedProject();
        if (!project) {
            this.messages.warn('No C# project detected. Open a workspace with a .csproj first.');
            return undefined;
        }
        this.selectedProjectPath = project.path;
        this.update();
        return project;
    }

    protected requireSolution(solutionPath?: string): CSharpSolutionSummary | undefined {
        const solutions = this.inspection?.solutions ?? [];
        const solution = solutionPath ? solutions.find(candidate => this.normalizePath(candidate.path) === this.normalizePath(solutionPath)) : solutions[0];
        if (!solution) {
            this.messages.warn('No .sln, .slnx or .slnf file detected in this workspace.');
            return undefined;
        }
        return solution;
    }

    protected solutionRestoreArgs(solution: CSharpSolutionSummary): string[] {
        return solution.format === 'slnf' ? ['msbuild', solution.path, '/t:Restore'] : ['restore', solution.path];
    }

    protected solutionBuildArgs(solution: CSharpSolutionSummary): string[] {
        return solution.format === 'slnf'
            ? ['msbuild', solution.path, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']
            : ['build', solution.path, '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'];
    }

    protected solutionCleanArgs(solution: CSharpSolutionSummary): string[] {
        return solution.format === 'slnf' ? ['msbuild', solution.path, '/t:Clean'] : ['clean', solution.path];
    }

    protected dotnetTestRunnerForTarget(targetPath: string): 'mtp' | 'vstest' {
        const candidate = this.nearestGlobalJsonForTarget(targetPath);
        return /^Microsoft\.Testing\.Platform$/i.test(candidate?.testRunner ?? '') ? 'mtp' : 'vstest';
    }

    protected nearestGlobalJsonForTarget(targetPath: string): CSharpWorkspaceInspection['globalJsons'][number] | undefined {
        const targetDirectory = this.pathExtension(targetPath) ? this.parentDirectory(targetPath) : targetPath;
        return (this.inspection?.globalJsons ?? [])
            .filter(globalJson => this.isInsideOrEqualDirectory(this.parentDirectory(globalJson.path), targetDirectory))
            .sort((left, right) => this.parentDirectory(right.path).length - this.parentDirectory(left.path).length)[0];
    }

    protected dotnetTestTargetArgs(targetPath: string, targetKind: 'project' | 'solution', runner: 'mtp' | 'vstest'): string[] {
        if (runner === 'mtp') {
            return ['test', targetKind === 'project' ? '--project' : '--solution', targetPath];
        }
        return ['test', targetPath];
    }

    protected dotnetTestConsoleArgs(runner: 'mtp' | 'vstest'): string[] {
        return runner === 'mtp' ? [] : ['--logger', 'console;verbosity=normal'];
    }

    protected parentDirectory(value: string): string {
        const normalized = this.normalizePath(value);
        const index = normalized.lastIndexOf('/');
        return index >= 0 ? normalized.slice(0, index) : '';
    }

    protected pathExtension(value: string): string {
        const fileName = this.fileName(value);
        const index = fileName.lastIndexOf('.');
        return index > 0 ? fileName.slice(index) : '';
    }

    protected isInsideOrEqualDirectory(parentDirectory: string, candidatePath: string): boolean {
        const parent = this.normalizePath(parentDirectory).replace(/\/+$/, '');
        const candidate = this.normalizePath(candidatePath).replace(/\/+$/, '');
        return candidate === parent || candidate.startsWith(`${parent}/`);
    }

    protected hasEntityFrameworkCore(project: CSharpProjectSummary | undefined): boolean {
        return !!project?.packageReferences.some(reference => /^Microsoft\.EntityFrameworkCore(?:\.|$)/i.test(reference.id));
    }

    protected warnIfMissingEntityFramework(project: CSharpProjectSummary): void {
        if (!this.hasEntityFrameworkCore(project)) {
            this.messages.warn(`${project.name} does not reference Microsoft.EntityFrameworkCore packages. dotnet ef may fail until EF Core packages and the dotnet-ef tool are installed.`);
        }
    }

    protected warnIfMissingUserSecrets(project: CSharpProjectSummary): void {
        if (!project.userSecretsId) {
            this.messages.warn(`${project.name} does not define UserSecretsId. Run C# Kit: Init User Secrets before listing, setting or removing user secrets.`);
        }
    }

    protected selectedProject(): CSharpProjectSummary | undefined {
        return this.selectedProjectPath ? this.projectByPath(this.selectedProjectPath) : this.inspection?.projects[0];
    }

    protected projectByPath(projectPath: string): CSharpProjectSummary | undefined {
        return this.inspection?.projects.find(project => project.path === projectPath);
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected setError(error: unknown): void {
        this.error = error instanceof Error ? error.message : String(error);
        this.messages.error(this.error);
        this.update();
    }

    protected override render(): React.ReactNode {
        const selected = this.selectedProject();
        return <div className='cv-csharp-kit'>
            <header className='cv-csharp-kit-header'>
                <div>
                    <h2>C# Kit</h2>
                    <span>{this.inspection?.workspacePath ?? 'No workspace'}</span>
                </div>
                <button type='button' title='Refresh' onClick={() => this.refresh()}>
                    <i className={codicon('refresh')} />
                </button>
            </header>
            {this.error && <div className='cv-csharp-kit-error'>{this.error}</div>}
            {this.loading && <div className='cv-csharp-kit-loading'>Loading...</div>}
            {this.renderDotnetStatus()}
            {this.renderGlobalJsons()}
            {this.renderCSharpKitConfig()}
            {this.renderRoslynStatus()}
            {this.renderLanguageServerStatus()}
            {this.renderDebugAdapterStatus()}
            {this.renderActions(selected)}
            {this.renderSolutionExplorer(selected)}
            {this.renderCapabilities()}
            {this.renderCodeContext()}
            {this.renderSemanticInventory()}
            {this.renderTests()}
            {this.renderPackages()}
            {this.renderPackageUpdates()}
            {this.renderPackageHealthIssues()}
            {this.renderRunSettings()}
            {this.renderDotnetToolManifests()}
            {this.renderEditorConfigs()}
            {this.renderNuGetConfigs()}
            {this.renderMappings()}
            {this.renderRecommendations()}
            {this.lastOutput && <pre className='cv-csharp-kit-output'>{this.lastOutput}</pre>}
        </div>;
    }

    protected renderDotnetStatus(): React.ReactNode {
        const dotnet = this.inspection?.dotnet;
        if (!dotnet) {
            return undefined;
        }
        return <section className='cv-csharp-kit-band'>
            <div className={`cv-csharp-kit-status ${dotnet.available ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(dotnet.available ? 'check' : 'warning')} />
                <strong>.NET SDK</strong>
                <span>{dotnet.available ? dotnet.version ?? 'detected' : dotnet.error ?? 'missing'}</span>
            </div>
            {dotnet.sdks.length > 0 && <span className='cv-csharp-kit-muted'>{dotnet.sdks.length} SDK(s), {dotnet.runtimes.length} runtime(s)</span>}
        </section>;
    }

    protected renderGlobalJsons(): React.ReactNode {
        const globalJsons = this.inspection?.globalJsons ?? [];
        if (!globalJsons.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>global.json</h3>
            <ul className='cv-csharp-kit-list'>
                {globalJsons.map(globalJson => <li key={globalJson.path}>
                    <strong>{globalJson.relativePath}</strong>
                    <small>{this.globalJsonLabel(globalJson)}</small>
                </li>)}
            </ul>
        </section>;
    }

    protected globalJsonLabel(globalJson: CSharpWorkspaceInspection['globalJsons'][number]): string {
        if (globalJson.error) {
            return `parse error: ${globalJson.error}`;
        }
        return [
            globalJson.sdkVersion ? `SDK ${globalJson.sdkVersion}` : 'no SDK version',
            globalJson.sdkInstalled === true ? 'installed' : globalJson.sdkInstalled === false ? 'not installed' : undefined,
            globalJson.rollForward ? `rollForward ${globalJson.rollForward}` : undefined,
            globalJson.allowPrerelease === undefined ? undefined : `allowPrerelease ${globalJson.allowPrerelease}`,
            globalJson.testRunner ? `test ${globalJson.testRunner}` : undefined,
            globalJson.paths.length ? `${globalJson.paths.length} path(s)` : undefined
        ].filter(Boolean).join(' · ');
    }

    protected renderCSharpKitConfig(): React.ReactNode {
        const config = this.inspection?.csharpKitConfig;
        if (!config || config.state === 'absent') {
            return undefined;
        }
        const ready = config.state === 'valid';
        const configured = [
            config.configuredRoslyn ? 'Roslyn' : undefined,
            ...config.configuredDebugAdapters.map(adapter => `${adapter} debug`),
            ...config.configuredLanguageServers.map(language => `${language} LSP`)
        ].filter(Boolean).join(', ');
        return <section className='cv-csharp-kit-band'>
            <div className={`cv-csharp-kit-status ${ready ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(ready ? 'settings-gear' : 'warning')} />
                <strong>C# Kit Config</strong>
                <span>{ready ? configured || 'valid template' : config.error ?? 'invalid JSON'}</span>
            </div>
            <code className='cv-csharp-kit-inline-path'>{config.relativePath}</code>
        </section>;
    }

    protected renderRoslynStatus(): React.ReactNode {
        const roslyn = this.inspection?.roslyn;
        if (!roslyn) {
            return undefined;
        }
        const ready = roslyn.mode === 'semantic-ready';
        return <section className='cv-csharp-kit-band'>
            <div className={`cv-csharp-kit-status ${ready ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(ready ? 'symbol-class' : 'warning')} />
                <strong>Roslyn Semantic Analysis</strong>
                <span>{roslyn.detail}</span>
            </div>
            {roslyn.analyzerPath && <code className='cv-csharp-kit-inline-path'>{roslyn.analyzerPath}</code>}
            {roslyn.buildCommand && <code className='cv-csharp-kit-inline-path'>{roslyn.buildCommand}</code>}
        </section>;
    }

    protected renderDebugAdapterStatus(): React.ReactNode {
        const debugAdapter = this.inspection?.debugAdapter;
        if (!debugAdapter) {
            return undefined;
        }
        const ready = debugAdapter.mode === 'ready';
        return <section className='cv-csharp-kit-band'>
            <div className={`cv-csharp-kit-status ${ready ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(ready ? 'debug-alt' : 'warning')} />
                <strong>CoreCLR Debug Adapter</strong>
                <span>{debugAdapter.detail}</span>
            </div>
            {debugAdapter.command && <code className='cv-csharp-kit-inline-path'>{debugAdapter.command} {debugAdapter.args.join(' ')}</code>}
            {!debugAdapter.command && <code className='cv-csharp-kit-inline-path'>{debugAdapter.setupHint}</code>}
        </section>;
    }

    protected renderLanguageServerStatus(): React.ReactNode {
        const adapters = this.inspection?.languageServers ?? [];
        if (!adapters.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-band'>
            {adapters.map(adapter => <div key={adapter.id} className={`cv-csharp-kit-status ${adapter.mode === 'ready' ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(adapter.mode === 'ready' ? 'server-process' : 'warning')} />
                <strong>{adapter.label}</strong>
                <span>{adapter.detail}</span>
                {adapter.command
                    ? <code className='cv-csharp-kit-inline-path'>{adapter.command} {adapter.args.join(' ')} (probe {adapter.probeTimeoutMs}ms)</code>
                    : <code className='cv-csharp-kit-inline-path'>{adapter.setupHint}</code>}
            </div>)}
        </section>;
    }

    protected renderActions(selected: CSharpProjectSummary | undefined): React.ReactNode {
        const hasEfCore = this.hasEntityFrameworkCore(selected);
        return <section className='cv-csharp-kit-actions'>
            <button type='button' title='Create a new C# project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.NEW_PROJECT.id)}><i className={codicon('new-folder')} /> New</button>
            <button type='button' title='Create a new C# item in the selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.NEW_ITEM.id, selected?.path)} disabled={!selected}><i className={codicon('new-file')} /> Item</button>
            <button type='button' title='Create a new C# solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.NEW_SOLUTION.id)}><i className={codicon('repo-create')} /> Solution</button>
            <button type='button' title='Add selected project to a solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.ADD_PROJECT_TO_SOLUTION.id, selected?.path)} disabled={!selected}><i className={codicon('repo')} /> Add Sln</button>
            <button type='button' title='Remove selected project from a solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.REMOVE_PROJECT_FROM_SOLUTION.id, selected?.path)} disabled={!selected}><i className={codicon('remove-close')} /> Rem Sln</button>
            <button type='button' title='Add a project reference to selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.ADD_PROJECT_REFERENCE.id, selected?.path)} disabled={!selected}><i className={codicon('references')} /> Add Ref</button>
            <button type='button' title='Remove a project reference from selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.REMOVE_PROJECT_REFERENCE.id, selected?.path)} disabled={!selected}><i className={codicon('close')} /> Rem Ref</button>
            <button type='button' title='Restore NuGet packages' onClick={() => this.runRestore(selected?.path)}><i className={codicon('cloud-download')} /> Restore</button>
            <button type='button' title='Restore selected solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.RESTORE_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('repo-pull')} /> S Restore</button>
            <button type='button' title='Build selected project' onClick={() => this.runBuild(selected?.path)} disabled={!selected}><i className={codicon('tools')} /> Build</button>
            <button type='button' title='Build selected solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.BUILD_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('repo')} /> S Build</button>
            <button type='button' title='Clean selected project' onClick={() => this.runClean(selected?.path)} disabled={!selected}><i className={codicon('clear-all')} /> Clean</button>
            <button type='button' title='Clean selected solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.CLEAN_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('repo-force-push')} /> S Clean</button>
            <button type='button' title='Rebuild selected project with MSBuild Rebuild' onClick={() => this.runRebuild(selected?.path)} disabled={!selected}><i className={codicon('debug-restart')} /> Rebuild</button>
            <button type='button' title='Rebuild selected solution with MSBuild Rebuild' onClick={() => this.commandService.executeCommand(CSharpKitCommands.REBUILD_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('repo-sync')} /> S Rebuild</button>
            <button type='button' title='Format selected project with dotnet format' onClick={() => this.formatProject(selected?.path)} disabled={!selected}><i className={codicon('wand')} /> Format</button>
            <button type='button' title='Format selected solution with dotnet format' onClick={() => this.commandService.executeCommand(CSharpKitCommands.FORMAT_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('symbol-misc')} /> S Format</button>
            <button type='button' title='Publish selected project with Release configuration' onClick={() => this.publishProject(selected?.path)} disabled={!selected}><i className={codicon('cloud-upload')} /> Publish</button>
            <button type='button' title='Publish selected project with a .pubxml profile' onClick={() => this.commandService.executeCommand(CSharpKitCommands.PUBLISH_PROFILE.id, selected?.path)} disabled={!selected || selected.publishProfiles.length === 0}><i className={codicon('cloud-upload')} /> Pub Prof</button>
            <button type='button' title='Initialize user secrets for selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.INIT_USER_SECRETS.id, selected?.path)} disabled={!selected}><i className={codicon('key')} /> Init Sec</button>
            <button type='button' title='List user secrets for selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.LIST_USER_SECRETS.id, selected?.path)} disabled={!selected}><i className={codicon('list-unordered')} /> Secrets</button>
            <button type='button' title='Set user secret for selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.SET_USER_SECRET.id, selected?.path)} disabled={!selected}><i className={codicon('key')} /> Set Sec</button>
            <button type='button' title='Trust ASP.NET Core HTTPS development certificate' onClick={() => this.commandService.executeCommand(CSharpKitCommands.TRUST_DEV_CERTIFICATE.id)}><i className={codicon('verified')} /> Dev Cert</button>
            <button type='button' title='List EF Core migrations for selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.LIST_EF_MIGRATIONS.id, selected?.path)} disabled={!selected || !hasEfCore}><i className={codicon('database')} /> EF List</button>
            <button type='button' title='Add EF Core migration to selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.ADD_EF_MIGRATION.id, selected?.path)} disabled={!selected || !hasEfCore}><i className={codicon('add')} /> EF Mig</button>
            <button type='button' title='Update EF Core database for selected project' onClick={() => this.commandService.executeCommand(CSharpKitCommands.UPDATE_EF_DATABASE.id, selected?.path)} disabled={!selected || !hasEfCore}><i className={codicon('database')} /> DB Update</button>
            <button type='button' title='Refresh build diagnostics in Problems' onClick={() => this.commandService.executeCommand(CSharpKitCommands.REFRESH_DIAGNOSTICS.id, selected?.path)} disabled={!selected}><i className={codicon('warning')} /> Diagnostics</button>
            <button type='button' title='Refresh language-server workspace diagnostics in Problems' onClick={() => this.commandService.executeCommand(CSharpKitCommands.REFRESH_LSP_WORKSPACE_DIAGNOSTICS.id)}><i className={codicon('pulse')} /> LSP Diag</button>
            <button type='button' title='Load Roslyn semantic inventory' onClick={() => this.loadSemanticInventory()} disabled={!selected}><i className={codicon('symbol-namespace')} /> Semantic</button>
            <button type='button' title='Build AI/Memory context for selected project' onClick={() => this.loadCodeContext(selected?.path)} disabled={!selected}><i className={codicon('lightbulb')} /> AI Ctx</button>
            <button type='button' title='Build AI/Memory context for selected solution or solution filter' onClick={() => this.commandService.executeCommand(CSharpKitCommands.LOAD_CODE_CONTEXT.id, { solutionOnly: true })} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('repo')} /> S AI Ctx</button>
            <button type='button' title='Run selected project' onClick={() => this.runProject(selected?.path)} disabled={!selected}><i className={codicon('play')} /> Run</button>
            <button type='button' title='Run selected launchSettings profile' onClick={() => this.commandService.executeCommand(CSharpKitCommands.RUN_LAUNCH_PROFILE.id, selected?.path)} disabled={!selected || selected.launchProfiles.length === 0}><i className={codicon('run')} /> Profile</button>
            <button type='button' title='Open selected launchSettings URL in the integrated browser' onClick={() => this.commandService.executeCommand(CSharpKitCommands.OPEN_LAUNCH_URL.id, selected?.path)} disabled={!selected || selected.launchProfiles.length === 0}><i className={codicon('browser')} /> Browser</button>
            <button type='button' title='Watch selected project' onClick={() => this.watchProject(selected?.path)} disabled={!selected}><i className={codicon('sync')} /> Watch</button>
            <button type='button' title='Watch selected launchSettings profile' onClick={() => this.commandService.executeCommand(CSharpKitCommands.WATCH_LAUNCH_PROFILE.id, selected?.path)} disabled={!selected || selected.launchProfiles.length === 0}><i className={codicon('debug-rerun')} /> W Profile</button>
            <button type='button' title='Test selected project' onClick={() => this.testProject(selected?.path)} disabled={!selected}><i className={codicon('beaker')} /> Test</button>
            <button type='button' title='Test selected solution' onClick={() => this.commandService.executeCommand(CSharpKitCommands.TEST_SOLUTION.id)} disabled={(this.inspection?.solutions.length ?? 0) === 0}><i className={codicon('beaker-stop')} /> S Test</button>
            <button type='button' title='Create or open C# Kit adapter and sidecar config' onClick={() => this.commandService.executeCommand(CSharpKitCommands.OPEN_ADAPTER_CONFIG.id)}><i className={codicon('settings-gear')} /> Config</button>
            <button type='button' title='Generate launch and task files' onClick={() => this.generateWorkspaceFiles(selected?.path)} disabled={!selected}><i className={codicon('debug-alt')} /> Launch</button>
            <button type='button' title='Debug selected launchSettings profile' onClick={() => this.commandService.executeCommand(CSharpKitCommands.DEBUG_LAUNCH_PROFILE.id, selected?.path)} disabled={!selected || selected.launchProfiles.length === 0}><i className={codicon('debug')} /> D Profile</button>
            <button type='button' title='Discover tests' onClick={() => this.discoverTests(selected?.path)} disabled={!selected}><i className={codicon('list-tree')} /> Discover</button>
            <button type='button' title='List NuGet packages' onClick={() => this.listPackages(selected?.path)} disabled={!selected}><i className={codicon('package')} /> Packages</button>
            <button type='button' title='Check NuGet package updates' onClick={() => this.listPackageUpdates(selected?.path)} disabled={!selected}><i className={codicon('versions')} /> Updates</button>
            <button type='button' title='Audit vulnerable and deprecated NuGet packages' onClick={() => this.listPackageHealth(selected?.path)} disabled={!selected}><i className={codicon('shield')} /> Audit</button>
            <button type='button' title='Search and install NuGet packages' onClick={() => this.commandService.executeCommand(CSharpKitCommands.SEARCH_PACKAGES.id, selected?.path)} disabled={!selected}><i className={codicon('search')} /> NuGet</button>
            <button type='button' title='Update NuGet package' onClick={() => this.commandService.executeCommand(CSharpKitCommands.UPDATE_PACKAGE.id, selected?.path)} disabled={!selected}><i className={codicon('arrow-up')} /> Update</button>
        </section>;
    }

    protected renderSolutionExplorer(selected: CSharpProjectSummary | undefined): React.ReactNode {
        const projects = this.inspection?.projects ?? [];
        const solutions = this.inspection?.solutions ?? [];
        const looseProjects = solutions.length > 0 ? this.projectsOutsideSolutions(solutions) : [];
        return <section className='cv-csharp-kit-section'>
            <h3>Solution Explorer</h3>
            {projects.length === 0 && <p className='cv-csharp-kit-muted'>No .csproj files detected.</p>}
            {projects.length > 0 && <div className='cv-csharp-kit-solution-tree'>
                {solutions.length > 0
                    ? <>
                        {solutions.map(solution => this.renderSolutionNode(solution, selected))}
                        {looseProjects.length > 0 && <article className='cv-csharp-kit-solution-node'>
                            <div className='cv-csharp-kit-tree-title'>
                                <i className={codicon('repo')} />
                                <strong>Workspace Projects</strong>
                                <small>{looseProjects.length} project(s)</small>
                            </div>
                            {looseProjects.map(project => this.renderProjectNode(project, selected))}
                        </article>}
                    </>
                    : <article className='cv-csharp-kit-solution-node'>
                        <div className='cv-csharp-kit-tree-title'>
                            <i className={codicon('repo')} />
                            <strong>Workspace</strong>
                            <small>{projects.length} project(s)</small>
                        </div>
                        {projects.map(project => this.renderProjectNode(project, selected))}
                    </article>}
            </div>}
        </section>;
    }

    protected renderSolutionNode(solution: CSharpSolutionSummary, selected: CSharpProjectSummary | undefined): React.ReactNode {
        const entries = this.solutionProjectEntries(solution);
        const loadedCount = entries.filter(entry => entry.project).length;
        return <article key={solution.path} className='cv-csharp-kit-solution-node'>
            <div className='cv-csharp-kit-tree-title' title={solution.path}>
                <i className={codicon('repo')} />
                <strong>{solution.name}</strong>
                <small>{this.solutionSummary(solution, loadedCount, entries.length)}</small>
            </div>
            {entries.map(entry => entry.project
                ? this.renderProjectNode(entry.project, selected)
                : this.renderMissingSolutionProject(entry.projectPath))}
        </article>;
    }

    protected solutionSummary(solution: CSharpSolutionSummary, loadedCount: number, entryCount: number): string {
        const source = solution.format === 'slnf' && solution.sourceSolutionName ? ` -> ${solution.sourceSolutionName}` : '';
        return `${solution.format}${source} · ${loadedCount}/${entryCount} loaded`;
    }

    protected renderMissingSolutionProject(projectPath: string): React.ReactNode {
        return <div key={projectPath} className='cv-csharp-kit-project-node is-missing'>
            <div className='cv-csharp-kit-missing-project' title={projectPath}>
                <i className={codicon('warning')} />
                <span>{this.fileName(projectPath)}</span>
                <small>Not found in workspace scan</small>
            </div>
        </div>;
    }

    protected renderProjectNode(project: CSharpProjectSummary, selected: CSharpProjectSummary | undefined): React.ReactNode {
        const isSelected = selected?.path === project.path;
        return <div key={project.path} className={`cv-csharp-kit-project-node ${isSelected ? 'is-selected' : ''}`}>
            <button
                type='button'
                title={project.path}
                onClick={() => {
                    this.selectedProjectPath = project.path;
                    this.update();
                }}>
                <i className={codicon(project.isTestProject ? 'beaker' : project.isAspNetCore ? 'globe' : 'symbol-class')} />
                <span>{project.name}</span>
                <small>{project.kind} · {project.targetFrameworks.join(', ') || 'unknown target'}</small>
            </button>
            <div className='cv-csharp-kit-project-details'>
                {this.renderProjectDetail('Frameworks', project.targetFrameworks, 'symbol-method')}
                {this.renderProjectDetail('Testing', this.projectTestValues(project), 'beaker')}
                {this.renderProjectDetail('Packages', project.packageReferences.map(reference => this.packageLabel(reference)), 'package')}
                {this.renderProjectDetail('User Secrets', project.userSecretsId ? [project.userSecretsId] : [], 'key')}
                {this.renderProjectDetail('Central Packages', this.centralPackageValues(project), 'versions')}
                {this.renderProjectDetail('MSBuild Imports', this.msBuildFileValues(project), 'settings-gear')}
                {this.renderProjectDetail('Project References', project.projectReferences.map(reference => reference.path), 'references')}
                {this.renderProjectDetail('Launch Profiles', project.launchProfiles.map(profile => this.launchProfileLabel(profile)), 'debug-alt')}
                {this.renderProjectDetail('Publish Profiles', project.publishProfiles.map(profile => this.publishProfileLabel(profile)), 'cloud-upload')}
                {this.renderProjectFiles(project.files)}
                {this.renderRazorFiles(project.razorFiles)}
            </div>
        </div>;
    }

    protected renderProjectDetail(label: string, values: string[], icon: string): React.ReactNode {
        const visible = values.slice(0, 10);
        return <div className='cv-csharp-kit-tree-group'>
            <span className='cv-csharp-kit-tree-group-title'>
                <i className={codicon(icon)} />
                {label}
                <small>{values.length}</small>
            </span>
            {visible.length === 0
                ? <span className='cv-csharp-kit-tree-empty'>None</span>
                : visible.map(value => <code key={value}>{value}</code>)}
            {values.length > visible.length && <span className='cv-csharp-kit-tree-empty'>+{values.length - visible.length} more</span>}
        </div>;
    }

    protected renderProjectFiles(files: CSharpProjectFile[]): React.ReactNode {
        const visible = files.slice(0, 80);
        return <div className='cv-csharp-kit-tree-group'>
            <span className='cv-csharp-kit-tree-group-title'>
                <i className={codicon('files')} />
                Files
                <small>{files.length}</small>
            </span>
            {visible.length === 0
                ? <span className='cv-csharp-kit-tree-empty'>No C# project files found.</span>
                : visible.map(file => <span key={file.path} className={`cv-csharp-kit-file is-${file.kind}`} title={file.path}>
                    <i className={codicon(this.projectFileIcon(file))} />
                    {file.relativePath}
                </span>)}
            {files.length > visible.length && <span className='cv-csharp-kit-tree-empty'>+{files.length - visible.length} more</span>}
        </div>;
    }

    protected renderRazorFiles(files: CSharpRazorFileSummary[]): React.ReactNode {
        if (!files.length) {
            return undefined;
        }
        const visible = files.slice(0, 20);
        return <div className='cv-csharp-kit-tree-group'>
            <span className='cv-csharp-kit-tree-group-title'>
                <i className={codicon('file-code')} />
                Razor Inventory
                <small>{files.length}</small>
            </span>
            {visible.map(file => <div key={file.path} className='cv-csharp-kit-razor-summary' title={file.path}>
                <span>
                    <i className={codicon(file.kind === 'cshtml' ? 'globe' : 'symbol-interface')} />
                    {file.relativePath}
                </span>
                {this.razorSummaryValues(file).map(value => <code key={value}>{value}</code>)}
            </div>)}
            {files.length > visible.length && <span className='cv-csharp-kit-tree-empty'>+{files.length - visible.length} more</span>}
        </div>;
    }

    protected razorSummaryValues(file: CSharpRazorFileSummary): string[] {
        return [
            ...file.routeTemplates.map(route => `@page ${route}`),
            file.model ? `@model ${file.model}` : undefined,
            file.inherits ? `@inherits ${file.inherits}` : undefined,
            file.effectiveNamespace ? `@namespace ${file.effectiveNamespace}` : undefined,
            file.effectiveLayout ? `@layout ${file.effectiveLayout}` : undefined,
            file.importedFiles.length ? `imports ${file.importedFiles.length}` : undefined,
            file.effectiveUsings.length ? `${file.effectiveUsings.length} using(s)` : undefined,
            file.effectiveInjections.length ? `${file.effectiveInjections.length} injection(s)` : undefined,
            file.effectiveTagHelpers.length ? `${file.effectiveTagHelpers.length} tag helper(s)` : undefined,
            file.effectiveTagHelperPrefix ? `prefix ${file.effectiveTagHelperPrefix}` : undefined,
            ...file.injections.map(injection => `@inject ${injection.type} ${injection.name}`),
            ...file.componentTags.slice(0, 8).map(tag => `<${tag}>`)
        ].filter((value): value is string => !!value);
    }

    protected projectsForSolution(solution: CSharpSolutionSummary): CSharpProjectSummary[] {
        const projectPaths = new Set(solution.projectPaths.map(projectPath => this.normalizePath(projectPath)));
        return (this.inspection?.projects ?? []).filter(project => projectPaths.has(this.normalizePath(project.path)));
    }

    protected solutionProjectEntries(solution: CSharpSolutionSummary): SolutionProjectEntry[] {
        const projects = this.inspection?.projects ?? [];
        return solution.projectPaths.map(projectPath => ({
            projectPath,
            project: projects.find(project => this.normalizePath(project.path) === this.normalizePath(projectPath))
        }));
    }

    protected projectsOutsideSolutions(solutions: CSharpSolutionSummary[]): CSharpProjectSummary[] {
        const projectPaths = new Set(solutions.flatMap(solution => solution.projectPaths.map(projectPath => this.normalizePath(projectPath))));
        return (this.inspection?.projects ?? []).filter(project => !projectPaths.has(this.normalizePath(project.path)));
    }

    protected packageLabel(reference: CSharpPackageReference): string {
        const label = reference.version ? `${reference.id} ${reference.version}` : reference.id;
        return reference.versionSource === 'central' ? `${label} (central)` : label;
    }

    protected centralPackageValues(project: CSharpProjectSummary): string[] {
        if (!project.centralPackageVersionPath) {
            return [];
        }
        return [
            `${project.centralPackageVersionPath} (${project.centralPackageVersions?.length ?? 0} version(s))`
        ];
    }

    protected projectTestValues(project: CSharpProjectSummary): string[] {
        return [
            project.isTestProject ? 'test project' : undefined,
            project.testFramework ? `framework ${project.testFramework}` : undefined,
            project.testRunner ? `runner ${project.testRunner}` : undefined
        ].filter((value): value is string => Boolean(value));
    }

    protected msBuildFileValues(project: CSharpProjectSummary): string[] {
        const preferredProperties = new Set([
            'TargetFramework',
            'TargetFrameworks',
            'LangVersion',
            'Nullable',
            'ImplicitUsings',
            'TreatWarningsAsErrors',
            'WarningsAsErrors',
            'AnalysisLevel',
            'EnforceCodeStyleInBuild'
        ]);
        return project.msBuildFiles.map(file => {
            const properties = [
                ...file.properties.filter(property => preferredProperties.has(property.name)),
                ...file.properties.filter(property => !preferredProperties.has(property.name))
            ].slice(0, 4);
            const summary = properties.length
                ? properties.map(property => `${property.name}=${property.value}`).join(', ')
                : `${file.properties.length} properties`;
            return `${file.relativePath} [${file.kind}] ${summary}`;
        });
    }

    protected launchProfileLabel(profile: CSharpProjectSummary['launchProfiles'][number]): string {
        return [
            profile.name,
            profile.commandName ? `[${profile.commandName}]` : undefined,
            profile.applicationUrl,
            profile.executablePath ? `exe ${profile.executablePath}` : undefined,
            profile.workingDirectory ? `cwd ${profile.workingDirectory}` : undefined,
            profile.hotReloadEnabled === false ? 'hot reload off' : undefined,
            profile.nativeDebugging ? 'native debug' : undefined
        ].filter(Boolean).join(' ');
    }

    protected publishProfileLabel(profile: CSharpProjectSummary['publishProfiles'][number]): string {
        return [
            profile.name,
            profile.publishProtocol ?? profile.webPublishMethod,
            profile.lastUsedBuildConfiguration,
            profile.targetFramework,
            profile.runtimeIdentifier,
            profile.publishUrl ?? profile.publishDir
        ].filter(Boolean).join(' ');
    }

    protected projectFileIcon(file: CSharpProjectFile): string {
        switch (file.kind) {
            case 'csharp':
                return 'symbol-class';
            case 'razor':
                return 'file-code';
            case 'config':
                return 'settings-gear';
            case 'resource':
                return 'symbol-color';
            case 'proto':
                return 'symbol-namespace';
            default:
                return 'file';
        }
    }

    protected normalizePath(value: string): string {
        return value.replace(/\\/g, '/').toLowerCase();
    }

    protected fileName(value: string): string {
        return value.replace(/\\/g, '/').split('/').pop() ?? value;
    }

    protected renderCapabilities(): React.ReactNode {
        const capabilities = this.inspection?.capabilities ?? [];
        return <section className='cv-csharp-kit-section'>
            <h3>Capabilities</h3>
            <div className='cv-csharp-kit-capabilities'>
                {capabilities.map(capability => this.renderCapability(capability))}
            </div>
        </section>;
    }

    protected renderCapability(capability: CSharpCapability): React.ReactNode {
        return <div key={capability.id} className={`cv-csharp-kit-capability is-${capability.state}`}>
            <strong>{capability.label}</strong>
            <span>{capability.state}</span>
            <p>{capability.detail}</p>
        </div>;
    }

    protected renderTests(): React.ReactNode {
        if (!this.tests.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>Discovered Tests</h3>
            <ul className='cv-csharp-kit-list'>
                {this.tests.slice(0, 80).map(test => <li key={test.id}>
                    <span>{test.displayName || test.name}</span>
                    <small>{[test.className, test.framework, test.testFramework].filter(Boolean).join(' · ')}</small>
                </li>)}
            </ul>
        </section>;
    }

    protected renderCodeContext(): React.ReactNode {
        const context = this.codeContext;
        if (!context) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>AI/Memory Context</h3>
            <div className='cv-csharp-kit-status is-ready'>
                <i className={codicon('lightbulb')} />
                <strong>{context.semanticMode}</strong>
                <span>{context.summary}</span>
            </div>
            <div className='cv-csharp-kit-capabilities'>
                {context.signals.map(signal => <div key={signal.label} className='cv-csharp-kit-capability is-ready' title={signal.detail}>
                    <strong>{signal.label}</strong>
                    <span>{signal.value}</span>
                </div>)}
            </div>
            {context.suggestions.length > 0 && <div className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon('lightbulb')} />
                    Suggestions
                    <small>{context.suggestions.length}</small>
                </span>
                {context.suggestions.map(suggestion => <code key={suggestion.id} title={suggestion.evidence.join('\n')}>{suggestion.title}: {suggestion.detail}</code>)}
            </div>}
            {context.sections.map(section => <div key={section.id} className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon(section.id === 'semantic' ? 'symbol-namespace' : section.id === 'symbols' ? 'symbol-method' : 'symbol-class')} />
                    {section.label}
                    <small>{section.items.length}</small>
                </span>
                {section.items.slice(0, 16).map((item, index) => <code key={`${section.id}:${index}:${item}`}>{item}</code>)}
                {section.items.length > 16 && <span className='cv-csharp-kit-tree-empty'>+{section.items.length - 16} more</span>}
            </div>)}
        </section>;
    }

    protected renderSemanticInventory(): React.ReactNode {
        const inventory = this.semanticInventory;
        if (!inventory) {
            return undefined;
        }
        const symbols = this.semanticVisibleSymbols(inventory).slice(0, 40);
        const relations = inventory.relations.slice(0, 30);
        const dependencyHints = inventory.dependencyHints.slice(0, 20);
        const callHints = inventory.callHints.slice(0, 20);
        return <section className='cv-csharp-kit-section'>
            <h3>Roslyn Semantic Inventory</h3>
            <div className={`cv-csharp-kit-status ${inventory.mode === 'semantic' ? 'is-ready' : 'is-missing'}`}>
                <i className={codicon(inventory.mode === 'semantic' ? 'symbol-namespace' : 'warning')} />
                <strong>{inventory.mode}</strong>
                <span>{inventory.detail}</span>
            </div>
            <div className='cv-csharp-kit-capabilities'>
                {this.semanticMetric('Files', inventory.analyzedFiles)}
                {this.semanticMetric('Symbols', inventory.summary.symbolCount)}
                {this.semanticMetric('Relations', inventory.summary.relationCount)}
                {this.semanticMetric('Endpoints', inventory.summary.endpointCount)}
                {this.semanticMetric('Tests', inventory.summary.testMethodCount)}
                {this.semanticMetric('DI', inventory.summary.dependencyHintCount)}
            </div>
            {symbols.length > 0 && <div className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon('symbol-class')} />
                    Symbols
                    <small>{inventory.summary.symbolCount}</small>
                </span>
                {symbols.map(symbol => <span key={symbol.id} className='cv-csharp-kit-file is-csharp' title={symbol.path}>
                    <i className={codicon(this.semanticSymbolIcon(symbol.kind))} />
                    {symbol.fullName ?? symbol.name}
                    <small>{symbol.kind}</small>
                </span>)}
            </div>}
            {relations.length > 0 && <div className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon('references')} />
                    Relations
                    <small>{inventory.summary.relationCount}</small>
                </span>
                {relations.map(relation => <code key={relation.id}>{relation.type}: {relation.evidence ?? relation.targetId}</code>)}
            </div>}
            {dependencyHints.length > 0 && <div className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon('type-hierarchy-sub')} />
                    Dependency Hints
                    <small>{inventory.summary.dependencyHintCount}</small>
                </span>
                {dependencyHints.map((hint, index) => <code key={`${hint.sourceSymbolId}:${hint.targetName}:${index}`}>{hint.evidence ?? hint.targetName}</code>)}
            </div>}
            {callHints.length > 0 && <div className='cv-csharp-kit-tree-group'>
                <span className='cv-csharp-kit-tree-group-title'>
                    <i className={codicon('call-incoming')} />
                    Call Hints
                    <small>{inventory.summary.callHintCount}</small>
                </span>
                {callHints.map((hint, index) => <code key={`${hint.sourceSymbolId}:${hint.targetName}:${index}`}>{hint.evidence ?? hint.targetName}</code>)}
            </div>}
        </section>;
    }

    protected semanticMetric(label: string, value: number): React.ReactNode {
        return <div key={label} className='cv-csharp-kit-capability is-ready'>
            <strong>{label}</strong>
            <span>{value}</span>
        </div>;
    }

    protected semanticVisibleSymbols(inventory: CSharpSemanticInventoryResult): CSharpSemanticInventoryResult['symbols'] {
        const priority = new Set(['endpoint', 'test_method', 'class', 'interface', 'record']);
        return inventory.symbols
            .filter(symbol => priority.has(symbol.kind) || symbol.metadata?.normalizedSymbolKind || symbol.metadata?.isDbContext)
            .sort((left, right) => this.semanticSymbolRank(right) - this.semanticSymbolRank(left) || left.name.localeCompare(right.name));
    }

    protected semanticSymbolRank(symbol: CSharpSemanticInventoryResult['symbols'][number]): number {
        if (symbol.kind === 'endpoint' || symbol.metadata?.normalizedSymbolKind === 'controller_action') {
            return 50;
        }
        if (symbol.kind === 'test_method' || symbol.metadata?.normalizedSymbolKind === 'test_method') {
            return 40;
        }
        if (symbol.metadata?.isDbContext || symbol.metadata?.normalizedSymbolKind === 'db_context') {
            return 35;
        }
        if (symbol.kind === 'class' || symbol.kind === 'interface' || symbol.kind === 'record') {
            return 20;
        }
        return 0;
    }

    protected semanticSymbolIcon(kind: string): string {
        switch (kind) {
            case 'endpoint':
                return 'globe';
            case 'test_method':
                return 'beaker';
            case 'interface':
                return 'symbol-interface';
            case 'method':
            case 'constructor':
                return 'symbol-method';
            case 'property':
            case 'field':
                return 'symbol-property';
            default:
                return 'symbol-class';
        }
    }

    protected renderPackages(): React.ReactNode {
        if (!this.packages.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>NuGet Packages</h3>
            <ul className='cv-csharp-kit-list'>
                {this.packages.map(pkg => <li key={`${pkg.id}:${pkg.version ?? ''}`}>
                    <span>{pkg.id}</span>
                    {pkg.version && <small>{pkg.version}</small>}
                </li>)}
            </ul>
        </section>;
    }

    protected renderPackageUpdates(): React.ReactNode {
        if (!this.packageUpdates.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>NuGet Updates</h3>
            <ul className='cv-csharp-kit-list'>
                {this.packageUpdates.map(update => <li key={`${update.projectPath ?? ''}:${update.framework ?? ''}:${update.id}:${update.latestVersion ?? ''}`}>
                    <span>{update.id}</span>
                    <small>
                        {(update.resolvedVersion ?? update.requestedVersion ?? 'installed')}{' -> '}{update.latestVersion ?? 'latest'}
                        {update.framework ? ` · ${update.framework}` : ''}
                        {update.transitive ? ' · transitive' : ''}
                    </small>
                </li>)}
            </ul>
        </section>;
    }

    protected renderPackageHealthIssues(): React.ReactNode {
        if (!this.packageHealthIssues.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>NuGet Audit</h3>
            <ul className='cv-csharp-kit-list'>
                {this.packageHealthIssues.map(issue => <li key={this.packageHealthIssueKey(issue)}>
                    <span>{issue.id}</span>
                    <small>{this.packageHealthIssueSummary(issue)}</small>
                    {issue.advisoryUrl && <code>{issue.advisoryUrl}</code>}
                    {issue.advisoryUrls?.filter(url => url !== issue.advisoryUrl).map(url => <code key={`${issue.id}:${url}`}>{url}</code>)}
                </li>)}
            </ul>
        </section>;
    }

    protected packageHealthIssueKey(issue: CSharpPackageHealthIssue): string {
        return [
            issue.projectPath ?? '',
            issue.framework ?? '',
            issue.kind,
            issue.id,
            issue.resolvedVersion ?? '',
            issue.severity ?? '',
            issue.advisoryUrl ?? '',
            issue.deprecationReasons?.join('|') ?? '',
            issue.transitive ? 'transitive' : 'direct'
        ].join(':');
    }

    protected packageHealthIssueSummary(issue: CSharpPackageHealthIssue): string {
        const parts = [
            issue.kind,
            issue.resolvedVersion ?? issue.requestedVersion,
            issue.framework,
            issue.transitive ? 'transitive' : 'direct',
            issue.severity,
            issue.deprecationReasons?.join(', '),
            issue.alternativePackageId ? `alternative ${issue.alternativePackageId}${issue.alternativePackageVersion ? ` ${issue.alternativePackageVersion}` : ''}` : undefined,
            issue.message
        ].filter(Boolean);
        return parts.join(' · ');
    }

    protected renderNuGetConfigs(): React.ReactNode {
        const configs = this.inspection?.nugetConfigs ?? [];
        if (!configs.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>NuGet Sources</h3>
            <ul className='cv-csharp-kit-list'>
                {configs.map(config => <li key={config.path}>
                    <span>{config.relativePath}</span>
                    <small>{this.nuGetConfigSummary(config)}</small>
                    {this.nuGetConfigValues(config).slice(0, 12).map(value => <code key={`${config.path}:${value}`}>{value}</code>)}
                </li>)}
            </ul>
        </section>;
    }

    protected nuGetConfigSummary(config: CSharpNuGetConfigSummary): string {
        const enabled = config.packageSources.filter(source => !source.disabled).length;
        const total = config.packageSources.length;
        const clear = config.clearPackageSources ? 'clears inherited sources, ' : '';
        return `${clear}${enabled}/${total} enabled source(s), ${config.packageSourceMappings.length} mapping group(s)`;
    }

    protected nuGetConfigValues(config: CSharpNuGetConfigSummary): string[] {
        return [
            ...(config.clearPackageSources ? ['<clear /> packageSources'] : []),
            ...config.packageSources.map(source => `${source.key}${source.disabled ? ' disabled' : ''}: ${source.value}`),
            ...config.packageSourceMappings.map(mapping => `${mapping.sourceKey}: ${mapping.patterns.join(', ')}`)
        ];
    }

    protected renderDotnetToolManifests(): React.ReactNode {
        const manifests = this.inspection?.toolManifests ?? [];
        if (!manifests.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>.NET Local Tools</h3>
            <ul className='cv-csharp-kit-list'>
                {manifests.map(manifest => <li key={manifest.path}>
                    <span>{manifest.relativePath}</span>
                    <small>{this.dotnetToolManifestSummary(manifest)}</small>
                    {manifest.tools.slice(0, 12).map(tool => <code key={`${manifest.path}:${tool.packageId}`}>{this.dotnetToolLabel(tool)}</code>)}
                </li>)}
            </ul>
        </section>;
    }

    protected dotnetToolManifestSummary(manifest: CSharpDotnetToolManifestSummary): string {
        return [
            manifest.isRoot === true ? 'root' : undefined,
            `${manifest.tools.length} tool(s)`
        ].filter(Boolean).join(', ');
    }

    protected dotnetToolLabel(tool: CSharpDotnetToolManifestSummary['tools'][number]): string {
        return [
            tool.packageId,
            tool.version,
            tool.commands.length ? `commands ${tool.commands.join(', ')}` : undefined,
            tool.rollForward === true ? 'rollForward' : undefined
        ].filter(Boolean).join(' ');
    }

    protected renderRunSettings(): React.ReactNode {
        const runSettings = this.inspection?.runSettings ?? [];
        if (!runSettings.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>Run Settings</h3>
            <ul className='cv-csharp-kit-list'>
                {runSettings.map(settings => <li key={settings.path}>
                    <span>{settings.relativePath}</span>
                    <small>{this.runSettingsSummary(settings)}</small>
                    {this.runSettingsValues(settings).slice(0, 12).map(value => <code key={`${settings.path}:${value}`}>{value}</code>)}
                </li>)}
            </ul>
        </section>;
    }

    protected runSettingsSummary(settings: CSharpRunSettingsSummary): string {
        return [
            `${settings.runConfiguration.length} run config setting(s)`,
            `${settings.dataCollectors.length} data collector(s)`,
            `${settings.testRunParameters.length} parameter(s)`,
            `${settings.mstestSettings.length} MSTest setting(s)`
        ].join(', ');
    }

    protected runSettingsValues(settings: CSharpRunSettingsSummary): string[] {
        return [
            ...settings.runConfiguration.map(property => `RunConfiguration: ${property.name}=${property.value}`),
            ...settings.dataCollectors.map(collector => `DataCollector: ${collector}`),
            ...settings.testRunParameters.map(parameter => `Parameter: ${parameter.name}=${parameter.value}`),
            ...settings.mstestSettings.map(property => `MSTest: ${property.name}=${property.value}`)
        ];
    }

    protected renderEditorConfigs(): React.ReactNode {
        const configs = [
            ...(this.inspection?.editorConfigs ?? []),
            ...(this.inspection?.globalConfigs ?? [])
        ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
        if (!configs.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>AnalyzerConfig</h3>
            <ul className='cv-csharp-kit-list'>
                {configs.map(config => <li key={config.path}>
                    <span>{config.relativePath}</span>
                    <small>{this.editorConfigSummary(config)}</small>
                    {this.editorConfigValues(config).slice(0, 12).map(value => <code key={`${config.path}:${value}`}>{value}</code>)}
                </li>)}
            </ul>
        </section>;
    }

    protected editorConfigSummary(config: CSharpEditorConfigSummary): string {
        return [
            config.kind === 'globalconfig' ? 'globalconfig' : undefined,
            config.root === true ? 'root' : undefined,
            config.isGlobal === true ? 'global' : undefined,
            config.globalLevel ? `level ${config.globalLevel}` : undefined,
            `${config.sections.length} section(s)`,
            `${config.csharpPropertyCount + config.dotnetPropertyCount} C#/dotnet setting(s)`,
            `${config.analyzerRuleCount} analyzer rule(s)`
        ].filter(Boolean).join(', ');
    }

    protected editorConfigValues(config: CSharpEditorConfigSummary): string[] {
        return config.sections.flatMap(section => section.properties
            .filter(property => /^csharp_|^dotnet_/i.test(property.key))
            .slice(0, 6)
            .map(property => `${section.pattern}: ${property.key}=${property.value}`));
    }

    protected renderMappings(): React.ReactNode {
        const mappings = this.inspection?.microsoftMappings ?? [];
        return <section className='cv-csharp-kit-section'>
            <h3>Microsoft Extension Map</h3>
            <div className='cv-csharp-kit-map'>
                {mappings.map(mapping => <article key={mapping.microsoftExtensionId}>
                    <strong>{mapping.microsoftName}</strong>
                    <code>{mapping.microsoftExtensionId}</code>
                    <span>{mapping.cyberVinciComponent}</span>
                    <p>{mapping.capability}</p>
                </article>)}
            </div>
        </section>;
    }

    protected renderRecommendations(): React.ReactNode {
        const recommendations = this.inspection?.recommendations ?? [];
        if (!recommendations.length) {
            return undefined;
        }
        return <section className='cv-csharp-kit-section'>
            <h3>Next Steps</h3>
            <ul className='cv-csharp-kit-list'>
                {recommendations.map(item => <li key={item}>{item}</li>)}
            </ul>
        </section>;
    }
}

interface SolutionProjectEntry {
    projectPath: string;
    project?: CSharpProjectSummary;
}

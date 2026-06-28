import { FileUri } from '@theia/core/lib/common/file-uri';
import { CancellationToken, CancellationTokenSource, MessageService } from '@theia/core/lib/common';
import { DebugSession } from '@theia/debug/lib/browser/debug-session';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { DebugSessionOptions } from '@theia/debug/lib/browser/debug-session-options';
import { interfaces } from '@theia/core/shared/inversify';
import { TestContribution, TestRunProfileKind, TestService } from '@theia/test/lib/browser/test-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CSharpKitService, CSharpProjectSummary, CSharpTestResult } from '../common';
import { CSharpTestController, CSharpTestItem, CSharpTestProject, CSharpTestRun } from './csharp-test-controller';

const CSHARP_TEST_INITIAL_REFRESH_DELAY_MS = 1000;

export class CSharpTestContribution implements TestContribution {

    protected controller: CSharpTestController;
    private service: CSharpKitService | undefined;
    private initialRefreshScheduled = false;

    constructor(protected readonly container: interfaces.Container) {
        this.init();
    }

    protected get workspaceService(): WorkspaceService {
        return this.container.get<WorkspaceService>(WorkspaceService);
    }

    protected get messages(): MessageService {
        return this.container.get<MessageService>(MessageService);
    }

    protected get debugSessionManager(): DebugSessionManager {
        return this.container.get<DebugSessionManager>(DebugSessionManager);
    }

    protected getService(): CSharpKitService {
        return this.service ??= this.container.get<CSharpKitService>(CSharpKitService);
    }

    protected init(): void {
        this.controller = new CSharpTestController(
            token => this.refreshProjects(token),
            (run, items, debug) => this.runItems(run, items, debug)
        );
        this.controller.addProfile({
            kind: TestRunProfileKind.Run,
            label: 'Run C# tests',
            isDefault: true,
            canConfigure: false,
            tag: '',
            run: (name, included, excluded) => {
                this.controller.createRun(name, included, excluded, false);
            },
            configure: () => undefined
        });
        this.controller.addProfile({
            kind: TestRunProfileKind.Debug,
            label: 'Debug C# tests',
            isDefault: false,
            canConfigure: false,
            tag: '',
            run: (name, included, excluded) => {
                this.controller.createRun(name, included, excluded, true);
            },
            configure: () => undefined
        });
    }

    registerTestControllers(service: TestService): void {
        service.registerTestController(this.controller);
        this.scheduleInitialRefresh();
    }

    protected scheduleInitialRefresh(): void {
        if (this.initialRefreshScheduled) {
            return;
        }
        this.initialRefreshScheduled = true;
        setTimeout(() => {
            const tokenSource = new CancellationTokenSource();
            void this.controller.refreshTests(tokenSource.token).catch(error => {
                this.messages.warn(`C# Kit could not refresh C# tests automatically: ${error instanceof Error ? error.message : String(error)}`);
            }).finally(() => tokenSource.dispose());
        }, CSHARP_TEST_INITIAL_REFRESH_DELAY_MS);
    }

    protected async refreshProjects(token: CancellationToken): Promise<CSharpTestProject[]> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return [];
        }
        const inspection = await this.getService().inspectWorkspace({ workspacePath });
        const testProjects = inspection.projects.filter(project => project.isTestProject);
        const projects: CSharpTestProject[] = [];
        for (const project of testProjects) {
            if (token.isCancellationRequested) {
                return [];
            }
            try {
                const discovered = await this.getService().discoverTests({ workspacePath, projectPath: project.path });
                projects.push({
                    path: project.path,
                    name: this.projectLabel(project),
                    tests: discovered.tests
                });
            } catch (error) {
                this.messages.warn(`C# Kit could not discover tests for ${project.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return projects;
    }

    protected async runItems(run: CSharpTestRun, items: CSharpTestItem[], debug: boolean): Promise<void> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            run.appendOutput('Open a workspace before running C# tests.\n');
            run.finish();
            return;
        }
        const byProject = new Map<string, CSharpTestItem[]>();
        for (const item of items) {
            const list = byProject.get(item.metadata.projectPath) ?? [];
            list.push(item);
            byProject.set(item.metadata.projectPath, list);
        }
        try {
            if (debug) {
                await this.debugItems(workspacePath, run, items);
                return;
            }
            for (const [projectPath, projectItems] of byProject) {
                for (const item of projectItems) {
                    run.start(item);
                    const filterName = item.metadata.filterName ?? item.metadata.testName;
                    const result = await this.getService().runTests({
                        workspacePath,
                        projectPath,
                        testNames: filterName ? [filterName] : undefined,
                        noRestore: true,
                        debug
                    });
                    const testResult = this.resultForItem(item, result.results, projectPath);
                    if (testResult) {
                        run.applyResult(item, testResult);
                    } else {
                        run.appendOutput(result.rawOutput, item);
                        run.applyResult(item, {
                            name: item.metadata.testName ?? item.label,
                            projectPath,
                            outcome: result.ok ? 'passed' : 'errored',
                            stdout: result.rawOutput,
                            stderr: '',
                            durationMs: 0
                        });
                    }
                }
            }
        } catch (error) {
            for (const item of items) {
                run.applyResult(item, {
                    name: item.metadata.testName ?? item.label,
                    projectPath: item.metadata.projectPath,
                    outcome: 'errored',
                    stdout: '',
                    stderr: error instanceof Error ? error.message : String(error),
                    durationMs: 0
                });
            }
        } finally {
            run.finish();
        }
    }

    protected async debugItems(workspacePath: string, run: CSharpTestRun, items: CSharpTestItem[]): Promise<void> {
        for (const item of items) {
            run.start(item);
            let resultsDirectory: string | undefined;
            try {
                const filterName = item.metadata.filterName ?? item.metadata.testName ?? item.label;
                run.appendOutput(`Starting CoreCLR debug session for ${filterName}.\n`, item);
                const prepared = await this.getService().prepareTestDebugSession({
                    workspacePath,
                    projectPath: item.metadata.projectPath,
                    testName: filterName,
                    noRestore: true
                });
                resultsDirectory = prepared.resultsDirectory;
                const session = await this.debugSessionManager.start(this.debugSessionOptions(workspacePath, run, item, prepared.args, prepared.cwd));
                if (!session || typeof session === 'boolean') {
                    throw new Error('The CoreCLR debug session did not start.');
                }
                await this.waitForDebugSessionEnd(session);
                const result = await this.getService().collectTestResults({
                    workspacePath,
                    projectPath: item.metadata.projectPath,
                    resultsDirectory
                });
                resultsDirectory = undefined;
                const testResult = this.resultForItem(item, result.results, item.metadata.projectPath);
                if (testResult) {
                    run.applyResult(item, testResult);
                    continue;
                }
                run.applyResult(item, {
                    name: item.metadata.testName ?? item.label,
                    projectPath: item.metadata.projectPath,
                    outcome: 'skipped',
                    stdout: result.rawOutput || 'Debug session ended, but no structured TRX result was produced.',
                    stderr: '',
                    durationMs: 0
                });
            } catch (error) {
                if (resultsDirectory) {
                    await this.discardDebugResults(workspacePath, item.metadata.projectPath, resultsDirectory);
                }
                run.applyResult(item, {
                    name: item.metadata.testName ?? item.label,
                    projectPath: item.metadata.projectPath,
                    outcome: 'errored',
                    stdout: '',
                    stderr: error instanceof Error ? error.message : String(error),
                    durationMs: 0
                });
            }
        }
    }

    protected async discardDebugResults(workspacePath: string, projectPath: string, resultsDirectory: string): Promise<void> {
        try {
            await this.getService().collectTestResults({ workspacePath, projectPath, resultsDirectory });
        } catch {
            // Best-effort cleanup for failed debug sessions.
        }
    }

    protected debugSessionOptions(workspacePath: string, run: CSharpTestRun, item: CSharpTestItem, args: string[], cwd: string): DebugSessionOptions {
        const configuration = {
            name: `C# Kit: Debug ${item.label}`,
            type: 'coreclr',
            request: 'launch',
            program: 'dotnet',
            args,
            cwd,
            console: 'integratedTerminal',
            stopAtEntry: false
        };
        return {
            name: configuration.name,
            configuration,
            workspaceFolderUri: FileUri.create(workspacePath).toString(),
            testRun: {
                controllerId: this.controller.id,
                runId: run.id
            },
            startedByUser: true
        };
    }

    protected resultForItem(item: CSharpTestItem, results: CSharpTestResult[], projectPath: string): CSharpTestResult | undefined {
        if (!results.length) {
            return undefined;
        }
        const exactName = item.metadata.testName;
        const exact = exactName ? results.find(result => result.name === exactName) : undefined;
        if (exact) {
            return exact;
        }
        if (results.length === 1) {
            return results[0];
        }
        return {
            name: exactName ?? item.label,
            projectPath,
            outcome: this.aggregateOutcome(results),
            stdout: results.map(result => result.stdout).filter(Boolean).join('\n'),
            stderr: results.map(result => result.stderr).filter(Boolean).join('\n'),
            exitCode: results.find(result => result.exitCode !== undefined)?.exitCode,
            durationMs: results.reduce((total, result) => total + result.durationMs, 0)
        };
    }

    protected aggregateOutcome(results: CSharpTestResult[]): CSharpTestResult['outcome'] {
        if (results.some(result => result.outcome === 'errored')) {
            return 'errored';
        }
        if (results.some(result => result.outcome === 'failed')) {
            return 'failed';
        }
        if (results.every(result => result.outcome === 'skipped')) {
            return 'skipped';
        }
        return 'passed';
    }

    protected waitForDebugSessionEnd(session: DebugSession): Promise<void> {
        return new Promise(resolve => {
            const disposable = this.debugSessionManager.onDidDestroyDebugSession(destroyed => {
                if (destroyed.id === session.id) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected projectLabel(project: CSharpProjectSummary): string {
        return project.targetFrameworks.length ? `${project.name} (${project.targetFrameworks.join(', ')})` : project.name;
    }
}

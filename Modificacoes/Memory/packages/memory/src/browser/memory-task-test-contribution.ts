import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { Disposable, DisposableCollection } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { inject, injectable, optional, preDestroy } from '@theia/core/shared/inversify';
import {
    BackgroundTaskEndedEvent,
    TaskConfiguration,
    TaskCustomization,
    TaskExitedEvent,
    TaskInfo
} from '@theia/task/lib/common';
import { TaskWatcher } from '@theia/task/lib/common/task-watcher';
import {
    TestExecutionState,
    TestRun,
    TestRunProfileKind,
    TestService,
    TestStateChangedEvent
} from '@theia/test/lib/browser/test-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { MemoryEventType, MemoryService } from '../common';

@injectable()
export class MemoryTaskTestContribution implements FrontendApplicationContribution {

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(TaskWatcher) @optional()
    protected readonly taskWatcher: TaskWatcher | undefined;

    @inject(TestService) @optional()
    protected readonly testService: TestService | undefined;

    protected readonly toDispose = new DisposableCollection();
    protected readonly testRunDisposables = new Map<string, DisposableCollection>();
    protected readonly recentTaskEvents = new Map<string, number>();

    onStart(_app: FrontendApplication): void {
        if (this.taskWatcher) {
            this.toDispose.push(this.taskWatcher.onTaskCreated(event => this.recordTaskStarted(event)));
            this.toDispose.push(this.taskWatcher.onDidStartTaskProcess(event => this.recordTaskStarted(event)));
            this.toDispose.push(this.taskWatcher.onTaskExit(event => this.recordTaskEnded(event)));
            this.toDispose.push(this.taskWatcher.onDidEndTaskProcess(event => this.recordTaskEnded(event)));
            this.toDispose.push(this.taskWatcher.onBackgroundTaskEnded(event => this.recordBackgroundTaskEnded(event)));
        }
        if (this.testService) {
            for (const controller of this.testService.getControllers()) {
                this.trackControllerTestRuns(controller);
            }
            this.toDispose.push(this.testService.onControllersChanged(delta => {
                for (const controller of delta.added ?? []) {
                    this.trackControllerTestRuns(controller);
                }
                for (const controllerId of delta.removed ?? []) {
                    this.disposeControllerTestRuns(controllerId);
                }
            }));
        }
    }

    @preDestroy()
    protected dispose(): void {
        this.toDispose.dispose();
        for (const disposables of this.testRunDisposables.values()) {
            disposables.dispose();
        }
        this.testRunDisposables.clear();
    }

    protected async recordTaskStarted(event: TaskInfo): Promise<void> {
        if (this.isDuplicateTaskEvent(event.taskId, 'started')) {
            return;
        }
        const eventTypes = this.taskEventTypes(event.config, 'started');
        await this.recordEvents(eventTypes, {
            source: 'theia-task-watcher',
            taskId: event.taskId,
            taskType: event.config.type,
            label: event.config.label,
            group: this.taskGroup(event.config),
            terminalId: event.terminalId
        });
    }

    protected async recordTaskEnded(event: TaskExitedEvent): Promise<void> {
        const state = event.code === 0 ? 'succeeded' : 'failed';
        if (this.isDuplicateTaskEvent(event.taskId, state)) {
            return;
        }
        const eventTypes = this.taskEventTypes(event.config, state);
        await this.recordEvents(eventTypes, {
            source: 'theia-task-watcher',
            taskId: event.taskId,
            taskType: event.config?.type,
            label: event.config?.label,
            group: event.config ? this.taskGroup(event.config) : undefined,
            terminalId: event.terminalId,
            exitCode: event.code,
            signal: event.signal
        });
    }

    protected async recordBackgroundTaskEnded(event: BackgroundTaskEndedEvent): Promise<void> {
        if (this.isDuplicateTaskEvent(event.taskId, 'background-succeeded')) {
            return;
        }
        await this.recordEvents(['task.succeeded'], {
            source: 'theia-task-watcher',
            taskId: event.taskId,
            background: true
        });
    }

    protected trackControllerTestRuns(controller: { id: string; label: string; testRuns: readonly TestRun[]; onRunsChanged: (listener: (delta: { added?: TestRun[]; removed?: TestRun[] }) => void) => Disposable }): void {
        const controllerDisposables = this.testRunDisposables.get(controller.id) ?? new DisposableCollection();
        for (const run of controller.testRuns) {
            this.trackTestRun(controller.id, controller.label, run, controllerDisposables);
        }
        controllerDisposables.push(controller.onRunsChanged(delta => {
            for (const run of delta.added ?? []) {
                this.trackTestRun(controller.id, controller.label, run, controllerDisposables);
            }
        }));
        this.testRunDisposables.set(controller.id, controllerDisposables);
    }

    protected trackTestRun(controllerId: string, controllerLabel: string, run: TestRun, disposables: DisposableCollection): void {
        const key = `${controllerId}:${run.id}`;
        if (this.testRunDisposables.has(key)) {
            return;
        }
        const runDisposables = new DisposableCollection();
        runDisposables.push(run.onDidChangeProperty(change => {
            if (change.isRunning === true) {
                this.recordTestRunEvent('test.started', controllerId, controllerLabel, run).catch(() => undefined);
            } else if (change.isRunning === false) {
                this.recordFinishedTestRun(controllerId, controllerLabel, run).catch(() => undefined);
            }
        }));
        runDisposables.push(run.onDidChangeTestState(events => {
            this.recordFailedTestCases(controllerId, controllerLabel, run, events).catch(() => undefined);
        }));
        disposables.push(runDisposables);
        this.testRunDisposables.set(key, runDisposables);
        if (run.isRunning) {
            this.recordTestRunEvent('test.started', controllerId, controllerLabel, run).catch(() => undefined);
        }
    }

    protected async recordFinishedTestRun(controllerId: string, controllerLabel: string, run: TestRun): Promise<void> {
        const hasFailure = run.items.some(item => {
            const state = run.getTestState(item)?.state;
            return state === TestExecutionState.Failed || state === TestExecutionState.Errored;
        });
        await this.recordTestRunEvent(hasFailure ? 'test.failed' : 'test.passed', controllerId, controllerLabel, run);
    }

    protected async recordFailedTestCases(controllerId: string, controllerLabel: string, run: TestRun, events: TestStateChangedEvent[]): Promise<void> {
        const failures = events
            .filter(event => event.newState?.state === TestExecutionState.Failed || event.newState?.state === TestExecutionState.Errored)
            .slice(0, 20)
            .map(event => ({
                id: event.test.id,
                label: event.test.label,
                uri: event.test.uri?.toString()
            }));
        if (!failures.length) {
            return;
        }
        await this.recordTestRunEvent('test.failed', controllerId, controllerLabel, run, { failures });
    }

    protected async recordTestRunEvent(
        eventType: 'test.started' | 'test.failed' | 'test.passed',
        controllerId: string,
        controllerLabel: string,
        run: TestRun,
        extra: Record<string, unknown> = {}
    ): Promise<void> {
        await this.recordEvents([eventType], {
            source: 'theia-test-service',
            controllerId,
            controllerLabel,
            runId: run.id,
            runName: run.name,
            profileKind: this.profileKind(run.controller.testRunProfiles[0]?.kind),
            itemCount: run.items.length,
            ...extra
        });
    }

    protected taskEventTypes(task: TaskConfiguration | undefined, state: 'started' | 'failed' | 'succeeded'): MemoryEventType[] {
        const eventTypes: MemoryEventType[] = [`task.${state}` as MemoryEventType];
        const group = task ? this.taskGroup(task) : undefined;
        if (group === 'build' || group === 'test') {
            eventTypes.push(`${group}.${state === 'succeeded' ? (group === 'test' ? 'passed' : 'succeeded') : state}` as MemoryEventType);
        }
        return eventTypes;
    }

    protected taskGroup(task: TaskCustomization): 'build' | 'test' | 'rebuild' | 'clean' | 'none' | undefined {
        if (typeof task.group === 'string') {
            return task.group;
        }
        return task.group?.kind;
    }

    protected isDuplicateTaskEvent(taskId: number, state: string): boolean {
        const key = `${taskId}:${state}`;
        const now = Date.now();
        const last = this.recentTaskEvents.get(key) ?? 0;
        this.recentTaskEvents.set(key, now);
        return now - last < 1000;
    }

    protected profileKind(kind: TestRunProfileKind | undefined): string | undefined {
        switch (kind) {
            case TestRunProfileKind.Run: return 'run';
            case TestRunProfileKind.Debug: return 'debug';
            case TestRunProfileKind.Coverage: return 'coverage';
            default: return undefined;
        }
    }

    protected async recordEvents(eventTypes: MemoryEventType[], payload: Record<string, unknown>): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (settings.enabled !== true || settings.optIn?.events !== true) {
            return;
        }
        await Promise.all(eventTypes.map(eventType => this.memoryService.recordEvent({
            workspacePath,
            eventType,
            payload: JSON.stringify(payload)
        })));
    }

    protected disposeControllerTestRuns(controllerId: string): void {
        for (const [key, disposables] of this.testRunDisposables) {
            if (key === controllerId || key.startsWith(`${controllerId}:`)) {
                disposables.dispose();
                this.testRunDisposables.delete(key);
            }
        }
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }
}

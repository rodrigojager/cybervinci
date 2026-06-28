import URI from '@theia/core/lib/common/uri';
import { CancellationToken, Disposable, Emitter, Event } from '@theia/core/lib/common';
import { MarkdownString } from '@theia/core/lib/common/markdown-rendering';
import {
    TestController,
    TestExecutionState,
    TestFailure,
    TestItem,
    TestMessage,
    TestOutputItem,
    TestRun,
    TestRunProfile,
    TestState,
    TestStateChangedEvent,
    TestSuccess
} from '@theia/test/lib/browser/test-service';
import { CollectionDelta, DeltaKind, TreeDelta } from '@theia/test/lib/common/tree-delta';
import { CSharpProjectSummary, CSharpTestCase, CSharpTestOutcome, CSharpTestResult } from '../common';

export interface CSharpTestItemMetadata {
    projectPath: string;
    testName?: string;
    filterName?: string;
    namespaceName?: string;
    className?: string;
    methodName?: string;
    framework?: string;
    testFramework?: CSharpTestCase['testFramework'];
}

export class CSharpTestItem implements TestItem {
    readonly tags = ['csharp'];
    readonly busy = false;
    readonly canResolveChildren = false;
    readonly error: string | MarkdownString | undefined = undefined;
    readonly range = undefined;
    readonly sortKey: string | undefined = undefined;

    constructor(
        readonly id: string,
        readonly label: string,
        readonly uri: URI | undefined,
        readonly metadata: CSharpTestItemMetadata,
        readonly controller: CSharpTestController,
        readonly parent: CSharpTestItem | undefined,
        readonly tests: readonly CSharpTestItem[] = [],
        readonly description?: string
    ) { }

    get path(): string[] {
        return this.parent ? [...this.parent.path, this.id] : [this.id];
    }

    resolveChildren(): void {
        // C# Kit discovers test children eagerly during Test Explorer refresh.
    }
}

export class CSharpTestRun implements TestRun {
    protected readonly onDidChangePropertyEmitter = new Emitter<{ name?: string; isRunning?: boolean }>();
    protected readonly onDidChangeTestStateEmitter = new Emitter<TestStateChangedEvent[]>();
    protected readonly onDidChangeTestOutputEmitter = new Emitter<[TestItem | undefined, TestOutputItem][]>();
    protected readonly testStates = new Map<TestItem, TestState>();
    protected readonly outputs: TestOutputItem[] = [];
    protected readonly outputIndices = new Map<TestItem, number[]>();
    protected running = true;

    readonly onDidChangeProperty: Event<{ name?: string; isRunning?: boolean }> = this.onDidChangePropertyEmitter.event;
    readonly onDidChangeTestState: Event<TestStateChangedEvent[]> = this.onDidChangeTestStateEmitter.event;
    readonly onDidChangeTestOutput: Event<[TestItem | undefined, TestOutputItem][]> = this.onDidChangeTestOutputEmitter.event;

    constructor(
        readonly controller: CSharpTestController,
        readonly id: string,
        readonly name: string,
        readonly items: readonly CSharpTestItem[],
        protected readonly onCancel: () => void = () => undefined
    ) { }

    get isRunning(): boolean {
        return this.running;
    }

    cancel(): void {
        this.onCancel();
        this.finish();
    }

    getTestState(item: TestItem): TestState | undefined {
        return this.testStates.get(item);
    }

    getOutput(item?: TestItem): readonly TestOutputItem[] {
        if (!item) {
            return this.outputs;
        }
        const indices = this.outputIndices.get(item);
        return indices ? indices.map(index => this.outputs[index]) : [];
    }

    queue(item: CSharpTestItem): void {
        this.setState(item, { state: TestExecutionState.Queued });
    }

    start(item: CSharpTestItem): void {
        this.setState(item, { state: TestExecutionState.Running });
    }

    applyResult(item: CSharpTestItem, result: CSharpTestResult): void {
        const output = `${result.stdout}\n${result.stderr}`.trim();
        if (output) {
            this.appendOutput(`${output}\n`, item);
        }
        const state = this.stateFromOutcome(result.outcome, result);
        this.setState(item, state);
    }

    appendOutput(output: string, item?: TestItem): void {
        const outputItem = { output };
        this.outputs.push(outputItem);
        if (item) {
            let indices = this.outputIndices.get(item);
            if (!indices) {
                indices = [];
                this.outputIndices.set(item, indices);
            }
            indices.push(this.outputs.length - 1);
        }
        this.onDidChangeTestOutputEmitter.fire([[item, outputItem]]);
    }

    finish(): void {
        if (!this.running) {
            return;
        }
        this.running = false;
        this.onDidChangePropertyEmitter.fire({ isRunning: false });
    }

    protected setState(item: CSharpTestItem, newState: TestState): void {
        const oldState = this.testStates.get(item);
        this.testStates.set(item, newState);
        this.onDidChangeTestStateEmitter.fire([{ test: item, oldState, newState }]);
    }

    protected stateFromOutcome(outcome: CSharpTestOutcome, result: CSharpTestResult): TestState {
        switch (outcome) {
            case 'passed':
                return this.successState(result);
            case 'skipped':
                return { state: TestExecutionState.Skipped };
            case 'errored':
                return this.failureState(TestExecutionState.Errored, result);
            case 'failed':
            default:
                return this.failureState(TestExecutionState.Failed, result);
        }
    }

    protected successState(result: CSharpTestResult): TestSuccess {
        return {
            state: TestExecutionState.Passed,
            duration: result.durationMs
        };
    }

    protected failureState(state: TestExecutionState.Failed | TestExecutionState.Errored, result: CSharpTestResult): TestFailure {
        const message: TestMessage = {
            message: result.stderr || result.stdout || `${result.name} ${state === TestExecutionState.Failed ? 'failed' : 'errored'}`
        };
        return {
            state,
            messages: [message],
            duration: result.durationMs
        };
    }
}

export class CSharpTestController implements TestController {
    readonly id = 'cybervinci.csharp-kit.tests';
    readonly label = 'C# Kit Tests';
    readonly canResolveChildren = false;

    protected readonly onItemsChangedEmitter = new Emitter<TreeDelta<string, TestItem>[]>();
    protected readonly onRunsChangedEmitter = new Emitter<CollectionDelta<TestRun, TestRun>>();
    protected readonly onProfilesChangedEmitter = new Emitter<CollectionDelta<TestRunProfile, TestRunProfile>>();
    protected readonly profiles: TestRunProfile[] = [];
    protected readonly runs: TestRun[] = [];
    protected rootItems: CSharpTestItem[] = [];

    readonly onItemsChanged: Event<TreeDelta<string, TestItem>[]> = this.onItemsChangedEmitter.event;
    readonly onRunsChanged: Event<CollectionDelta<TestRun, TestRun>> = this.onRunsChangedEmitter.event;
    readonly onProfilesChanged: Event<CollectionDelta<TestRunProfile, TestRunProfile>> = this.onProfilesChangedEmitter.event;

    constructor(
        protected readonly refreshCallback: (token: CancellationToken) => Promise<CSharpTestProject[]>,
        protected readonly runCallback: (run: CSharpTestRun, items: CSharpTestItem[], debug: boolean) => Promise<void>
    ) { }

    get tests(): readonly CSharpTestItem[] {
        return this.rootItems;
    }

    get testRunProfiles(): readonly TestRunProfile[] {
        return this.profiles;
    }

    get testRuns(): readonly TestRun[] {
        return this.runs;
    }

    addProfile(profile: TestRunProfile): void {
        this.profiles.push(profile);
        this.onProfilesChangedEmitter.fire({ added: [profile] });
    }

    addRun(run: CSharpTestRun): Disposable {
        this.runs.push(run);
        this.onRunsChangedEmitter.fire({ added: [run] });
        return Disposable.create(() => {
            const index = this.runs.indexOf(run);
            if (index >= 0) {
                this.runs.splice(index, 1);
                this.onRunsChangedEmitter.fire({ removed: [run] });
            }
        });
    }

    async refreshTests(token: CancellationToken): Promise<void> {
        const projects = await this.refreshCallback(token);
        if (token.isCancellationRequested) {
            return;
        }
        this.replaceProjects(projects);
    }

    resolveChildren(_item?: TestItem): void {
        // Test children are loaded during refresh.
    }

    clearRuns(): void {
        const removed = [...this.runs];
        this.runs.length = 0;
        this.onRunsChangedEmitter.fire({ removed });
    }

    createRun(name: string, included: readonly TestItem[] | undefined, excluded: readonly TestItem[] | undefined, debug: boolean): CSharpTestRun {
        const selected = this.collectRunnableItems(included?.length ? included : this.rootItems, excluded ?? []);
        const run = new CSharpTestRun(this, `csharp-run-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, selected);
        this.addRun(run);
        selected.forEach(item => run.queue(item));
        this.runCallback(run, selected, debug).catch(error => {
            run.appendOutput(error instanceof Error ? error.message : String(error));
            run.finish();
        });
        return run;
    }

    protected replaceProjects(projects: CSharpTestProject[]): void {
        const removed = this.rootItems.map(item => ({ path: item.path, type: DeltaKind.REMOVED }));
        this.rootItems = projects.map(project => this.createProjectItem(project));
        const added = this.rootItems.map(item => ({ path: item.path, type: DeltaKind.ADDED, value: item }));
        this.onItemsChangedEmitter.fire([...removed, ...added]);
    }

    protected createProjectItem(project: CSharpTestProject): CSharpTestItem {
        const projectUri = new URI(project.path);
        const projectId = `project-${stableId(project.path)}`;
        const children: CSharpTestItem[] = [];
        const parent = new CSharpTestItem(
            projectId,
            project.name,
            projectUri,
            { projectPath: project.path },
            this,
            undefined,
            children,
            `${project.tests.length} test(s)`
        );
        const grouped = this.groupTestsByClass(project.tests);
        for (const group of grouped) {
            if (!group.className) {
                group.tests.forEach(test => children.push(this.createTestItem(project.path, projectUri, test, parent)));
                continue;
            }
            const classChildren: CSharpTestItem[] = [];
            const classItem = new CSharpTestItem(
                `class-${stableId(`${project.path}:${group.qualifiedClassName}`)}`,
                group.className,
                projectUri,
                {
                    projectPath: project.path,
                    namespaceName: group.namespaceName,
                    className: group.className
                },
                this,
                parent,
                classChildren,
                group.namespaceName
            );
            group.tests.forEach(test => classChildren.push(this.createTestItem(project.path, projectUri, test, classItem)));
            children.push(classItem);
        }
        return parent;
    }

    protected createTestItem(projectPath: string, projectUri: URI, test: CSharpTestCase, parent: CSharpTestItem): CSharpTestItem {
        return new CSharpTestItem(
            `test-${stableId(`${projectPath}:${test.name}`)}`,
            this.testLabel(test),
            projectUri,
            {
                projectPath,
                testName: test.name,
                filterName: test.fullyQualifiedName || test.name,
                namespaceName: test.namespaceName,
                className: test.className,
                methodName: test.methodName,
                framework: test.framework,
                testFramework: test.testFramework
            },
            this,
            parent,
            [],
            this.testDescription(test)
        );
    }

    protected groupTestsByClass(tests: CSharpTestCase[]): CSharpTestClassGroup[] {
        const groups = new Map<string, CSharpTestClassGroup>();
        for (const test of tests) {
            const qualifiedClassName = test.className ? [test.namespaceName, test.className].filter(Boolean).join('.') : '';
            const key = qualifiedClassName || `ungrouped-${test.name}`;
            let group = groups.get(key);
            if (!group) {
                group = {
                    namespaceName: test.namespaceName,
                    className: test.className,
                    qualifiedClassName,
                    tests: []
                };
                groups.set(key, group);
            }
            group.tests.push(test);
        }
        return [...groups.values()].sort((left, right) => {
            if (!left.className || !right.className) {
                return left.className ? -1 : right.className ? 1 : 0;
            }
            return left.qualifiedClassName.localeCompare(right.qualifiedClassName);
        });
    }

    protected testLabel(test: CSharpTestCase): string {
        return test.displayName || test.methodName || test.name;
    }

    protected testDescription(test: CSharpTestCase): string | undefined {
        const parts = [test.framework, test.testFramework].filter(Boolean);
        return parts.length ? parts.join(' · ') : undefined;
    }

    protected collectRunnableItems(items: readonly TestItem[], excluded: readonly TestItem[]): CSharpTestItem[] {
        const excludedSet = new Set(excluded.map(item => item.id));
        const result: CSharpTestItem[] = [];
        const visit = (item: TestItem): void => {
            if (excludedSet.has(item.id)) {
                return;
            }
            if (item instanceof CSharpTestItem) {
                if (item.tests.length) {
                    item.tests.forEach(visit);
                } else if (item.metadata.testName) {
                    result.push(item);
                }
            }
        };
        items.forEach(visit);
        return result;
    }
}

export interface CSharpTestProject extends Pick<CSharpProjectSummary, 'path' | 'name'> {
    tests: CSharpTestCase[];
}

interface CSharpTestClassGroup {
    namespaceName?: string;
    className?: string;
    qualifiedClassName: string;
    tests: CSharpTestCase[];
}

function stableId(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
}

import { Disposable } from '@theia/core/lib/common';
import { ApplicationShell, codicon, ReactWidget, WidgetManager } from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { cybervinciCanvasProductLabel } from '@cybervinci/branding/lib/common';
import {
    OpenPencilAiReviewModel,
    OpenPencilAiReviewNodeChange,
    OpenPencilAiReviewNodeReference,
    OpenPencilAiReviewOperation,
    OpenPencilAiReviewPropertyChange
} from './openpencil-ai-review-model';

export const OpenPencilAiReviewWidgetOptions = Symbol('OpenPencilAiReviewWidgetOptions');

export interface OpenPencilAiReviewWidgetOptions {
    reviewId: string;
}

export interface OpenPencilAiReviewSession {
    id: string;
    model: OpenPencilAiReviewModel;
    canAlwaysApply?: boolean;
    apply: () => Promise<void>;
    alwaysApply?: () => Promise<void>;
    keep?: () => Promise<void> | void;
    openArtifact?: () => Promise<void>;
}

type OpenPencilAiReviewAction = 'apply' | 'alwaysApply' | 'keep' | 'openArtifact';

@injectable()
export class OpenPencilAiReviewService {

    protected nextReviewId = 0;
    protected readonly sessions = new Map<string, OpenPencilAiReviewSession>();

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    async openReview(options: Omit<OpenPencilAiReviewSession, 'id'>): Promise<OpenPencilAiReviewWidget> {
        const id = `review-${Date.now()}-${++this.nextReviewId}`;
        this.sessions.set(id, { id, ...options });
        const widget = await this.widgetManager.getOrCreateWidget<OpenPencilAiReviewWidget>(OpenPencilAiReviewWidget.ID, { reviewId: id });
        if (!widget.isAttached) {
            await this.shell.addWidget(widget, { area: 'main' });
        }
        await this.shell.activateWidget(widget.id);
        return widget;
    }

    getReview(id: string): OpenPencilAiReviewSession | undefined {
        return this.sessions.get(id);
    }

    disposeReview(id: string): void {
        this.sessions.delete(id);
    }

    async runAction(id: string, action: OpenPencilAiReviewAction): Promise<void> {
        const session = this.sessions.get(id);
        if (!session) {
            return;
        }
        if ((action === 'apply' || action === 'alwaysApply') && !session.model.canApply) {
            return;
        }
        switch (action) {
            case 'apply':
                await session.apply();
                break;
            case 'alwaysApply':
                await (session.alwaysApply ?? session.apply)();
                break;
            case 'keep':
                await session.keep?.();
                break;
            case 'openArtifact':
                await session.openArtifact?.();
                break;
        }
    }
}

@injectable()
export class OpenPencilAiReviewWidget extends ReactWidget {

    static readonly ID = 'openpencil.aiReview';
    static readonly LABEL = `${cybervinciCanvasProductLabel} AI Review`;

    protected pendingAction: OpenPencilAiReviewAction | undefined;
    protected actionError: string | undefined;

    constructor(
        @inject(OpenPencilAiReviewWidgetOptions) protected readonly options: OpenPencilAiReviewWidgetOptions,
        @inject(OpenPencilAiReviewService) protected readonly reviewService: OpenPencilAiReviewService
    ) {
        super();
    }

    @postConstruct()
    protected init(): void {
        this.id = `${OpenPencilAiReviewWidget.ID}:${this.options.reviewId}`;
        this.title.label = OpenPencilAiReviewWidget.LABEL;
        this.title.caption = OpenPencilAiReviewWidget.LABEL;
        this.title.iconClass = codicon('diff');
        this.title.closable = true;
        this.node.tabIndex = 0;
        this.addClass('openpencil-ai-review-widget');
        this.toDispose.push(Disposable.create(() => this.reviewService.disposeReview(this.options.reviewId)));
        this.update();
    }

    protected render(): React.ReactNode {
        const session = this.reviewService.getReview(this.options.reviewId);
        if (!session) {
            return <div className='openpencil-ai-review-empty'>
                <h2>{cybervinciCanvasProductLabel} AI Review</h2>
                <p>This review is no longer available.</p>
            </div>;
        }
        const { model } = session;
        const busy = this.pendingAction !== undefined;
        return <div className='openpencil-ai-review'>
            <header className='openpencil-ai-review-header'>
                <div className='openpencil-ai-review-title'>
                    <h2>{model.target}</h2>
                    <div className='openpencil-ai-review-meta'>
                        {model.sourceLabel && <span>{model.sourceLabel}</span>}
                        {model.providerLabel && <span>{model.providerLabel}</span>}
                        {model.previewArtifact && <span>{model.previewArtifact}</span>}
                    </div>
                </div>
                <div className='openpencil-ai-review-actions'>
                    <button className='theia-button main openpencil-ai-review-apply' title='Apply changes' disabled={busy || !model.canApply} onClick={() => this.runAction('apply')}>
                        <i className={codicon('check')}></i>
                        <span>Apply</span>
                    </button>
                    {session.canAlwaysApply && <button className='theia-button openpencil-ai-review-always' title='Always apply Canvas AI changes' disabled={busy || !model.canApply} onClick={() => this.runAction('alwaysApply')}>
                        <i className={codicon('sync')}></i>
                        <span>Always Apply</span>
                    </button>}
                    {session.openArtifact && <button className='theia-button' title='Open JSON artifact' disabled={busy} onClick={() => this.runAction('openArtifact')}>
                        <i className={codicon('json')}></i>
                        <span>Open JSON</span>
                    </button>}
                    <button className='theia-button secondary' title='Keep current design' disabled={busy} onClick={() => this.runAction('keep')}>
                        <i className={codicon('close')}></i>
                        <span>Keep</span>
                    </button>
                </div>
            </header>
            {this.renderStatus(session.model)}
            <main className='openpencil-ai-review-main'>
                {model.prompt && <section className='openpencil-ai-review-section openpencil-ai-review-prompt'>
                    <h3>Prompt</h3>
                    <p>{model.prompt}</p>
                </section>}
                <section className='openpencil-ai-review-section'>
                    <h3>Impact</h3>
                    {this.renderImpact(model)}
                </section>
                <section className='openpencil-ai-review-section'>
                    <h3>Selection</h3>
                    {this.renderSelection(model.currentSelection, model.previewSelection, model.selectionChanged)}
                </section>
                {this.renderDiagnostics(model)}
                <section className='openpencil-ai-review-section'>
                    <h3>Operations</h3>
                    <ol className='openpencil-ai-review-operations'>
                        {model.operations.map(operation => this.renderOperation(operation))}
                    </ol>
                </section>
            </main>
        </div>;
    }

    protected renderStatus(model: OpenPencilAiReviewModel): React.ReactNode {
        const valid = model.validation.valid;
        return <div className='openpencil-ai-review-status'>
            <div className='openpencil-ai-review-metric'>
                <span>{model.operations.length}</span>
                <label>Operations</label>
            </div>
            <div className='openpencil-ai-review-metric'>
                <span>{model.impact.created.length}</span>
                <label>Created</label>
            </div>
            <div className='openpencil-ai-review-metric'>
                <span>{model.impact.updated.length}</span>
                <label>Changed</label>
            </div>
            <div className='openpencil-ai-review-metric'>
                <span>{model.impact.removed.length}</span>
                <label>Removed</label>
            </div>
            <div className={`openpencil-ai-review-validation ${valid ? 'valid' : 'invalid'}`}>
                <i className={codicon(valid ? 'pass-filled' : 'error')}></i>
                <span>{valid ? 'Validation passed' : 'Validation failed'}</span>
                <small>{model.validationSummary.errors} errors, {model.validationSummary.warnings} warnings</small>
            </div>
            {this.pendingAction && <div className='openpencil-ai-review-progress'>
                <i className={codicon('loading') + ' theia-animation-spin'}></i>
                <span>{this.actionLabel(this.pendingAction)}</span>
            </div>}
            {this.actionError && <div className='openpencil-ai-review-action-error'>
                <i className={codicon('warning')}></i>
                <span>{this.actionError}</span>
            </div>}
            {model.message && <div className='openpencil-ai-review-message'>
                <i className={codicon('info')}></i>
                <span>{model.message}</span>
            </div>}
        </div>;
    }

    protected renderImpact(model: OpenPencilAiReviewModel): React.ReactNode {
        return <div className='openpencil-ai-review-impact'>
            {this.renderNodeGroup('Created nodes', model.impact.created, 'add')}
            {this.renderUpdatedNodes(model.impact.updated)}
            {this.renderNodeGroup('Removed nodes', model.impact.removed, 'trash')}
        </div>;
    }

    protected renderNodeGroup(title: string, nodes: OpenPencilAiReviewNodeReference[], icon: string): React.ReactNode {
        return <div className='openpencil-ai-review-node-group'>
            <h4><i className={codicon(icon)}></i>{title}</h4>
            {nodes.length ? <ul>
                {nodes.map(node => <li key={node.id}>
                    <strong>{node.label}</strong>
                    {node.parentId && <small>Parent: {node.parentId}</small>}
                </li>)}
            </ul> : <p className='openpencil-ai-review-muted'>None</p>}
        </div>;
    }

    protected renderUpdatedNodes(nodes: OpenPencilAiReviewNodeChange[]): React.ReactNode {
        return <div className='openpencil-ai-review-node-group'>
            <h4><i className={codicon('edit')}></i>Changed nodes</h4>
            {nodes.length ? <ul>
                {nodes.map(entry => <li key={entry.node.id}>
                    <strong>{entry.node.label}</strong>
                    {this.renderPropertyChanges(entry.changes)}
                </li>)}
            </ul> : <p className='openpencil-ai-review-muted'>None</p>}
        </div>;
    }

    protected renderSelection(
        before: OpenPencilAiReviewNodeReference[],
        after: OpenPencilAiReviewNodeReference[],
        changed: boolean
    ): React.ReactNode {
        return <div className='openpencil-ai-review-selection'>
            <div>
                <h4>Before</h4>
                {this.renderNodeChips(before)}
            </div>
            <div>
                <h4>After</h4>
                {this.renderNodeChips(after)}
            </div>
            <div className={`openpencil-ai-review-selection-state ${changed ? 'changed' : 'unchanged'}`}>
                <i className={codicon(changed ? 'arrow-swap' : 'check')}></i>
                <span>{changed ? 'Selection changes' : 'Selection unchanged'}</span>
            </div>
        </div>;
    }

    protected renderDiagnostics(model: OpenPencilAiReviewModel): React.ReactNode {
        const issues = model.validation.issues;
        if (!model.diagnostics.length && !issues.length) {
            return undefined;
        }
        return <section className='openpencil-ai-review-section'>
            <h3>Diagnostics</h3>
            <div className='openpencil-ai-review-diagnostics'>
                {issues.map((issue, index) => <div key={`validation-${index}`} className={`openpencil-ai-review-diagnostic ${issue.severity}`}>
                    <i className={codicon(issue.severity === 'error' ? 'error' : 'warning')}></i>
                    <span>{issue.path}: {issue.message}</span>
                </div>)}
                {model.diagnostics.map((diagnostic, index) => <div key={`diagnostic-${index}`} className='openpencil-ai-review-diagnostic info'>
                    <i className={codicon('info')}></i>
                    <span>{diagnostic}</span>
                </div>)}
            </div>
        </section>;
    }

    protected renderOperation(operation: OpenPencilAiReviewOperation): React.ReactNode {
        return <li key={operation.index} className={`openpencil-ai-review-operation ${operation.effect}`}>
            <div className='openpencil-ai-review-operation-main'>
                <div>
                    <h4>{operation.title}</h4>
                    <p>{operation.summary}</p>
                </div>
                <span className='openpencil-ai-review-operation-effect'>{operation.effect}</span>
            </div>
            {operation.targets.length > 0 && <div className='openpencil-ai-review-targets'>
                {operation.targets.map(target => <span key={target.id} className={`openpencil-ai-review-target ${target.status}`}>{target.label}</span>)}
            </div>}
            {operation.details.length > 0 && <ul className='openpencil-ai-review-details'>
                {operation.details.map((detail, index) => <li key={index}>{detail}</li>)}
            </ul>}
            {this.renderPropertyChanges(operation.propertyChanges)}
        </li>;
    }

    protected renderNodeChips(nodes: OpenPencilAiReviewNodeReference[]): React.ReactNode {
        if (!nodes.length) {
            return <p className='openpencil-ai-review-muted'>None</p>;
        }
        return <div className='openpencil-ai-review-targets'>
            {nodes.map(node => <span key={node.id} className={`openpencil-ai-review-target ${node.status}`}>{node.label}</span>)}
        </div>;
    }

    protected renderPropertyChanges(changes: OpenPencilAiReviewPropertyChange[]): React.ReactNode {
        if (!changes.length) {
            return undefined;
        }
        return <table className='openpencil-ai-review-change-table'>
            <tbody>
                {changes.map(change => <tr key={change.property}>
                    <th>{change.property}</th>
                    <td>{change.before}</td>
                    <td>{change.after}</td>
                </tr>)}
            </tbody>
        </table>;
    }

    protected async runAction(action: OpenPencilAiReviewAction): Promise<void> {
        if (this.pendingAction) {
            return;
        }
        this.pendingAction = action;
        this.actionError = undefined;
        this.update();
        try {
            await this.reviewService.runAction(this.options.reviewId, action);
            if (action !== 'openArtifact') {
                this.dispose();
            }
        } catch (error) {
            this.actionError = error instanceof Error ? error.message : String(error);
        } finally {
            this.pendingAction = undefined;
            if (!this.isDisposed) {
                this.update();
            }
        }
    }

    protected actionLabel(action: OpenPencilAiReviewAction): string {
        switch (action) {
            case 'apply':
                return 'Applying changes...';
            case 'alwaysApply':
                return 'Applying and remembering preference...';
            case 'keep':
                return 'Closing review...';
            case 'openArtifact':
                return 'Opening JSON...';
        }
    }
}

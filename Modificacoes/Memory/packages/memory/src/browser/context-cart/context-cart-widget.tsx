import { CommandService, DisposableCollection, MessageService, nls } from '@theia/core';
import { codicon, Message, ReactWidget } from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { MemorySourceKind } from '../../common';
import { MemoryCommands } from '../memory-commands';
import {
    ContextCartFeedbackInput,
    ContextCartItem,
    MemoryContextCartService
} from './context-cart-service';

const SOURCE_KIND_LABELS: Record<MemorySourceKind, string> = {
    code: 'Code',
    'code-graph': 'Graph',
    'local-docs': 'Docs',
    'external-docs': 'External Docs',
    'project-memory': 'Memory',
    'repository-memory': 'Repo Memory',
    'task-memory': 'Task Memory',
    skill: 'Skills',
    'agent-event': 'Events',
    'feedback-record': 'Feedback'
};

const SOURCE_KINDS = Object.keys(SOURCE_KIND_LABELS) as MemorySourceKind[];

@injectable()
export class MemoryContextCartWidget extends ReactWidget {

    static readonly ID = 'memory-context-cart-widget';
    static readonly LABEL = nls.localize('theia/memory/contextCart/widgetLabel', 'Context Cart');

    @inject(MemoryContextCartService)
    protected readonly contextCart: MemoryContextCartService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected readonly toDisposeOnCart = new DisposableCollection();
    protected readonly rejectionDrafts = new Map<string, ContextCartFeedbackInput>();

    @postConstruct()
    protected init(): void {
        this.id = MemoryContextCartWidget.ID;
        this.title.label = MemoryContextCartWidget.LABEL;
        this.title.caption = MemoryContextCartWidget.LABEL;
        this.title.iconClass = codicon('checklist');
        this.title.closable = true;
        this.node.tabIndex = 0;
        this.toDispose.push(this.toDisposeOnCart);
        this.toDisposeOnCart.push(this.contextCart.onDidChange(() => this.update()));
        this.update();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected render(): React.ReactNode {
        const state = this.contextCart.state;
        const acceptedCount = state.items.filter(item => item.status === 'accepted').length;
        const rejectedCount = state.items.filter(item => item.status === 'rejected').length;
        return <div className='memory-context-cart'>
            <header className='memory-context-cart-header'>
                <div>
                    <h2>{MemoryContextCartWidget.LABEL}</h2>
                    <span>{acceptedCount} approved - {rejectedCount} rejected - {state.items.length} suggested - {state.estimatedTokens} tokens</span>
                </div>
                <button className='theia-button secondary' title='Clear' disabled={state.busy} onClick={() => this.contextCart.clear()}>
                    <i className={codicon('clear-all')} />
                </button>
            </header>
            <section className='memory-context-cart-query'>
                <textarea
                    value={state.prompt}
                    rows={5}
                    placeholder={nls.localize('theia/memory/contextCart/promptPlaceholder', 'Paste or type the prompt that needs approved context.')}
                    onChange={event => this.contextCart.setPrompt(event.currentTarget.value)}
                />
                <div className='memory-context-cart-source-row'>
                    {SOURCE_KINDS.map(sourceKind => <button
                        key={sourceKind}
                        className={state.sourceKinds.includes(sourceKind) ? 'active' : ''}
                        disabled={state.busy}
                        onClick={() => this.contextCart.toggleSourceKind(sourceKind)}>
                        {SOURCE_KIND_LABELS[sourceKind]}
                    </button>)}
                </div>
                <div className='memory-context-cart-actions'>
                    <button className='theia-button main' disabled={state.busy} onClick={() => this.contextCart.suggest()}>
                        <i className={codicon('sparkle')} />
                        {state.busy ? nls.localizeByDefault('Loading...') : nls.localize('theia/memory/contextCart/suggest', 'Suggest Context')}
                    </button>
                    <button className='theia-button secondary' disabled={state.busy || !state.items.length} onClick={() => this.contextCart.acceptAll()}>
                        <i className={codicon('check-all')} />
                        {nls.localize('theia/memory/contextCart/acceptAll', 'Accept All')}
                    </button>
                    <button className='theia-button secondary' disabled={state.busy || !state.items.length} onClick={() => this.contextCart.rejectAll()}>
                        <i className={codicon('circle-slash')} />
                        {nls.localize('theia/memory/contextCart/rejectAll', 'Reject All')}
                    </button>
                </div>
                {state.error && <div className='memory-context-cart-error'>{state.error}</div>}
            </section>
            <section className='memory-context-cart-items'>
                {state.items.length ? state.items.map(item => this.renderItem(item)) : <div className='memory-context-cart-empty'>
                    <i className={codicon('search')} />
                    <span>{nls.localize('theia/memory/contextCart/noSuggestions', 'No context suggestions yet.')}</span>
                </div>}
            </section>
            <section className='memory-context-cart-pack'>
                <div className='memory-context-cart-pack-actions'>
                    <button className='theia-button secondary' disabled={!acceptedCount} onClick={() => this.commandService.executeCommand(MemoryCommands.BUILD_APPROVED_CONTEXT.id)}>
                        <i className={codicon('package')} />
                        {nls.localize('theia/memory/contextCart/buildPack', 'Build Pack')}
                    </button>
                    <button className='theia-button secondary' disabled={!acceptedCount} onClick={() => this.commandService.executeCommand(MemoryCommands.COPY_APPROVED_CONTEXT.id)}>
                        <i className={codicon('copy')} />
                        {nls.localizeByDefault('Copy')}
                    </button>
                    <button className='theia-button main' disabled={!acceptedCount} onClick={() => this.commandService.executeCommand(MemoryCommands.INSERT_APPROVED_CONTEXT.id)}>
                        <i className={codicon('comment-add')} />
                        {nls.localize('theia/memory/contextCart/insertIntoChat', 'Insert into Chat')}
                    </button>
                </div>
                <pre>{state.lastBuiltPack ?? nls.localize('theia/memory/contextCart/packPreviewEmpty', 'Build the pack to preview approved context.')}</pre>
            </section>
        </div>;
    }

    protected renderItem(item: ContextCartItem): React.ReactNode {
        const signals = item.rankingSignals;
        return <article key={item.id} className={`memory-context-cart-item status-${item.status}`}>
            <div className='memory-context-cart-item-header'>
                <div>
                    <strong>{item.title}</strong>
                    <span>{SOURCE_KIND_LABELS[item.sourceKind]} - score {item.score.toFixed(3)}</span>
                    <span>{item.status} - {item.estimatedTokens ?? 0} estimated tokens</span>
                </div>
                <div className='memory-context-cart-item-actions'>
                    <button className='theia-button secondary' title='Accept' disabled={item.status === 'accepted'} onClick={() => this.contextCart.accept(item.id)}>
                        <i className={codicon('check')} />
                    </button>
                    <button className='theia-button secondary' title='Reject' disabled={item.status === 'rejected'} onClick={() => this.rejectItem(item)}>
                        <i className={codicon('close')} />
                    </button>
                    <button className='theia-button secondary' title='Reset' disabled={item.status === 'pending'} onClick={() => this.contextCart.reset(item.id)}>
                        <i className={codicon('debug-restart')} />
                    </button>
                </div>
            </div>
            <div className='memory-context-cart-meta' aria-label='Suggestion metadata'>
                <span>Source: {SOURCE_KIND_LABELS[item.sourceKind]}</span>
                <span>Scope: {signals?.scope ?? 'not reported'}</span>
                <span>Stale: {signals?.staleStatus ? signals.staleStatus.replace('_', ' ') : 'not reported'}</span>
                <span>Importance: {signals?.importance ?? 'not reported'}</span>
                <span>Feedback: {this.feedbackLabel(item)}</span>
                <span>Graph: {this.graphSignalLabel(item)}</span>
            </div>
            <div className='memory-context-cart-ranking'>
                <span>Ranking reason</span>
                <p>{item.evidence ?? 'Memory retrieval match.'}</p>
            </div>
            {this.renderFeedbackControls(item)}
            <p>{item.snippet}</p>
            <footer>
                {item.uri && <span>{item.uri}</span>}
            </footer>
        </article>;
    }

    protected feedbackLabel(item: ContextCartItem): string {
        const signals = item.rankingSignals;
        if (signals?.feedbackMultiplier !== undefined) {
            return `x${signals.feedbackMultiplier}`;
        }
        if (signals?.acceptanceScore !== undefined) {
            return `acceptance ${signals.acceptanceScore}`;
        }
        return item.sourceKind === 'feedback-record' ? 'feedback record' : 'not applied';
    }

    protected graphSignalLabel(item: ContextCartItem): string {
        const signals = item.rankingSignals;
        const parts = [
            signals?.godNodeScore !== undefined ? `god ${signals.godNodeScore}` : undefined,
            signals?.communityScore !== undefined ? `community ${signals.communityScore}` : undefined,
            signals?.surprisingConnectionScore !== undefined ? `surprise ${signals.surprisingConnectionScore}` : undefined,
            signals?.riskScore !== undefined ? `risk ${signals.riskScore}` : undefined
        ].filter((part): part is string => !!part);
        return parts.length ? parts.join(', ') : 'not reported';
    }

    protected renderFeedbackControls(item: ContextCartItem): React.ReactNode {
        const draft = this.rejectionDrafts.get(item.id) ?? {};
        return <div className='memory-context-cart-feedback'>
            <select
                value={draft.reason ?? ''}
                disabled={item.status === 'accepted'}
                aria-label='Reject reason'
                onChange={event => this.updateRejectionDraft(item.id, { reason: event.currentTarget.value })}>
                <option value=''>Reject reason</option>
                <option value='irrelevant'>Irrelevant</option>
                <option value='outdated'>Outdated</option>
                <option value='too broad'>Too broad</option>
                <option value='sensitive'>Sensitive</option>
                <option value='wrong file'>Wrong file</option>
            </select>
            <input
                value={draft.correction ?? ''}
                disabled={item.status === 'accepted'}
                placeholder='Correction or better context'
                aria-label='Feedback correction'
                onChange={event => this.updateRejectionDraft(item.id, { correction: event.currentTarget.value })}
            />
        </div>;
    }

    protected updateRejectionDraft(id: string, patch: ContextCartFeedbackInput): void {
        this.rejectionDrafts.set(id, { ...this.rejectionDrafts.get(id), ...patch });
        this.update();
    }

    protected rejectItem(item: ContextCartItem): void {
        this.contextCart.reject(item.id, this.rejectionDrafts.get(item.id));
    }
}

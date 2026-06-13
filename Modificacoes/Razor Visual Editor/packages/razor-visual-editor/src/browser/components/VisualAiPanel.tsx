import * as React from '@theia/core/shared/react';
import { VisualAiProviderDescriptor } from '../types/visual-ai';

export interface VisualAiPanelRunOptions {
    providerId: string;
    model: string;
    instruction: string;
}

export interface VisualAiPanelProps {
    providers: VisualAiProviderDescriptor[];
    loadingProviders: boolean;
    running: boolean;
    summary?: string;
    error?: string;
    onRun(options: VisualAiPanelRunOptions): Promise<void>;
    onRefreshProviders(): void;
    onClose(): void;
}

export function VisualAiPanel(props: VisualAiPanelProps): React.ReactElement {
    const [providerId, setProviderId] = React.useState('');
    const [model, setModel] = React.useState('auto');
    const [instruction, setInstruction] = React.useState('');
    const selectedProvider = props.providers.find(provider => provider.id === providerId) ?? props.providers[0];
    const modelListId = React.useMemo(() => `cv-ai-models-${Math.random().toString(36).slice(2)}`, []);

    React.useEffect(() => {
        if (!providerId && props.providers.length > 0) {
            const preferred = props.providers.find(provider => provider.status === 'ready') ?? props.providers[0];
            setProviderId(preferred.id);
            setModel(preferred.defaultModel ?? preferred.models[0] ?? 'auto');
        }
    }, [providerId, props.providers]);

    React.useEffect(() => {
        if (selectedProvider && !model) {
            setModel(selectedProvider.defaultModel ?? selectedProvider.models[0] ?? 'auto');
        }
    }, [model, selectedProvider]);

    const canRun = Boolean(instruction.trim()) && Boolean(selectedProvider) && selectedProvider.status === 'ready' && !props.running;

    return <section className='cv-ai-panel' role='dialog' aria-label='Visual AI editor'>
        <header>
            <div className='cv-ai-title'>
                <SparklesIcon />
                <div>
                    <h3>Visual AI</h3>
                    <span>Ask an agent to change the page visually</span>
                </div>
            </div>
            <button type='button' className='cv-ai-icon-button' onClick={props.onClose} title='Close Visual AI' aria-label='Close Visual AI'>
                <i className='fa fa-times' />
            </button>
        </header>
        <div className='cv-ai-grid'>
            <label>
                <span>Provider</span>
                <select value={providerId} onChange={event => {
                    const nextProvider = props.providers.find(provider => provider.id === event.currentTarget.value);
                    setProviderId(event.currentTarget.value);
                    setModel(nextProvider?.defaultModel ?? nextProvider?.models[0] ?? 'auto');
                }}>
                    {props.providers.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                </select>
            </label>
            <label>
                <span>Model</span>
                <input
                    value={model}
                    list={modelListId}
                    placeholder='auto, gpt-5, etc.'
                    onChange={event => setModel(event.currentTarget.value)}
                />
                <datalist id={modelListId}>
                    {(selectedProvider?.models ?? []).map(item => <option key={item} value={item} />)}
                </datalist>
            </label>
        </div>
        <div className={`cv-ai-provider-status ${selectedProvider?.status ?? 'unavailable'}`}>
            {props.loadingProviders
                ? 'Checking providers...'
                : selectedProvider
                    ? `${statusLabel(selectedProvider.status)}${selectedProvider.statusMessage ? `: ${selectedProvider.statusMessage}` : ''}`
                    : 'No provider available.'}
            <button type='button' onClick={props.onRefreshProviders} title='Refresh providers'>
                <i className='fa fa-refresh' />
            </button>
        </div>
        <label className='cv-ai-instruction'>
            <span>What should change?</span>
            <textarea
                value={instruction}
                rows={5}
                placeholder='Example: make the header more modern, turn the cards into a responsive Bootstrap 5 layout, and keep all Razor tokens intact.'
                onChange={event => setInstruction(event.currentTarget.value)}
            />
        </label>
        <div className='cv-ai-safety'>
            <span><i className='fa fa-lock' /> Razor tokens locked</span>
            <span><i className='fa fa-eye' /> Applies to preview only</span>
            <span><i className='fa fa-floppy-o' /> Save remains manual</span>
        </div>
        {props.error && <p className='cv-ai-message error'>{props.error}</p>}
        {props.summary && !props.error && <p className='cv-ai-message'>{props.summary}</p>}
        <footer>
            <button type='button' className='cv-ai-secondary' onClick={props.onClose}>Cancel</button>
            <button type='button' className='cv-ai-primary' onClick={() => props.onRun({ providerId, model, instruction })} disabled={!canRun}>
                <SparklesIcon /> {props.running ? 'Running...' : 'Run AI'}
            </button>
        </footer>
    </section>;
}

export function SparklesIcon(): React.ReactElement {
    return <svg className='cv-ai-sparkles-icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 2l1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2z' />
        <path d='M19 14l.8 2.6 2.7.9-2.7.9L19 21l-.8-2.6-2.7-.9 2.7-.9L19 14z' />
        <path d='M5 13l.7 2.1 2.3.8-2.3.8L5 19l-.7-2.3-2.3-.8 2.3-.8L5 13z' />
    </svg>;
}

function statusLabel(status: VisualAiProviderDescriptor['status']): string {
    switch (status) {
        case 'ready':
            return 'Ready';
        case 'needs-auth':
            return 'Needs authentication';
        case 'not-configured':
            return 'Not configured';
        default:
            return 'Unavailable';
    }
}


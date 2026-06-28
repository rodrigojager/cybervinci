import * as React from '@theia/core/shared/react';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService
} from '@cybervinci/ai-runtime/lib/common';
import { CyberVinciAiExecutionPicker } from '@cybervinci/ai-runtime/lib/browser/components';
import { SelectedElementSnapshot } from '../types/selected-element';

export interface VisualAiPanelRunOptions {
    execution: CyberVinciAiExecutionSelection;
    instruction: string;
    includeSelectedElementContext: boolean;
}

export interface VisualAiPanelProps {
    runtimeService?: CyberVinciAiRuntimeService;
    workspacePath?: string;
    selectedElement?: SelectedElementSnapshot;
    includeSelectedElementContext: boolean;
    running: boolean;
    summary?: string;
    error?: string;
    onRun(options: VisualAiPanelRunOptions): Promise<void>;
    onIncludeSelectedElementContextChange(include: boolean): void;
    onClose(): void;
}

export function VisualAiPanel(props: VisualAiPanelProps): React.ReactElement {
    const [execution, setExecution] = React.useState<CyberVinciAiExecutionSelection>({
        reasoningPolicy: 'auto',
        reasoningEffort: 'medium'
    });
    const [selectedProvider, setSelectedProvider] = React.useState<CyberVinciAiProviderDescriptor | undefined>();
    const [instruction, setInstruction] = React.useState('');
    const providerUnavailable = !!selectedProvider && (!selectedProvider.available || !!selectedProvider.configurationRequired?.length);
    const canRun = Boolean(props.runtimeService)
        && Boolean(instruction.trim())
        && Boolean(execution.providerId)
        && !providerUnavailable
        && !props.running;

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
        {props.runtimeService ? <CyberVinciAiExecutionPicker
            service={props.runtimeService}
            workspacePath={props.workspacePath}
            value={execution}
            disabled={props.running}
            onSelectedProviderChange={setSelectedProvider}
            onChange={setExecution}
        /> : <div className='cv-ai-runtime-error'>CyberVinci AI Runtime is not available in this build.</div>}
        <SelectedElementContext
            selection={props.selectedElement}
            include={props.includeSelectedElementContext}
            onIncludeChange={props.onIncludeSelectedElementContextChange}
        />
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
            <button type='button' className='cv-ai-primary' onClick={() => props.onRun({
                execution,
                instruction,
                includeSelectedElementContext: props.includeSelectedElementContext
            })} disabled={!canRun}>
                <SparklesIcon /> {props.running ? 'Running...' : 'Run AI'}
            </button>
        </footer>
    </section>;
}

const SelectedElementContext: React.FC<{
    selection?: SelectedElementSnapshot;
    include: boolean;
    onIncludeChange(include: boolean): void;
}> = ({ selection, include, onIncludeChange }) => {
    if (!selection) {
        return <div className='cv-ai-context empty'>
            <span>Context</span>
            <strong>No selected element</strong>
        </div>;
    }
    const title = selectedElementTitle(selection);
    return <div className={`cv-ai-context${include ? '' : ' excluded'}`}>
        <span>Context</span>
        {include ? <button type='button' className='cv-ai-context-chip' title={`Remove ${title} from AI context`} onClick={() => onIncludeChange(false)}>
            <i className='fa fa-crosshairs' />
            <strong>{title}</strong>
            <i className='fa fa-times' />
        </button> : <button type='button' className='cv-ai-context-restore' title={`Use ${title} as AI context`} onClick={() => onIncludeChange(true)}>
            Selected element excluded. Click to restore.
        </button>}
    </div>;
};

export function SparklesIcon(): React.ReactElement {
    return <svg className='cv-ai-sparkles-icon' viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 2l1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2z' />
        <path d='M19 14l.8 2.6 2.7.9-2.7.9L19 21l-.8-2.6-2.7-.9 2.7-.9L19 14z' />
        <path d='M5 13l.7 2.1 2.3.8-2.3.8L5 19l-.7-2.3-2.3-.8 2.3-.8L5 13z' />
    </svg>;
}

function selectedElementTitle(selection: SelectedElementSnapshot): string {
    const classes = selection.classes.slice(0, 2).map(className => `.${className}`).join('');
    const id = selection.attributes.id ? `#${selection.attributes.id}` : '';
    const tag = selection.tagName ? `<${selection.tagName}>` : selection.type;
    return `${selection.label || tag} ${tag}${id}${classes}`.trim();
}

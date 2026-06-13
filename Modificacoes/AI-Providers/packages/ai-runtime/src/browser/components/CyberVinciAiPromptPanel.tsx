// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as React from '@theia/core/shared/react';
import {
    CyberVinciAiEffectPolicy,
    CyberVinciAiExecutionSelection,
    CyberVinciAiOutputContract,
    CyberVinciAiRuntimeService,
    CyberVinciAiTaskRequest,
    CyberVinciAiTaskResult
} from '../../common';
import { CyberVinciAiExecutionPicker } from './CyberVinciAiExecutionPicker';

export interface CyberVinciAiPromptPanelBuildInput {
    prompt: string;
    execution: CyberVinciAiExecutionSelection;
}

export interface CyberVinciAiPromptPanelProps<TStructured = unknown> {
    service: CyberVinciAiRuntimeService;
    title: string;
    surfaceId: string;
    action: string;
    workspacePath?: string;
    defaultPrompt?: string;
    placeholder?: string;
    systemPrompt?: string;
    input?: unknown;
    output?: CyberVinciAiOutputContract;
    effectPolicy?: CyberVinciAiEffectPolicy;
    buildRequest?: (input: CyberVinciAiPromptPanelBuildInput) => CyberVinciAiTaskRequest;
    onResult: (result: CyberVinciAiTaskResult<TStructured>) => void | Promise<void>;
    onClose?: () => void;
}

export const CyberVinciAiPromptPanel = <TStructured,>({
    service,
    title,
    surfaceId,
    action,
    workspacePath,
    defaultPrompt = '',
    placeholder,
    systemPrompt,
    input,
    output,
    effectPolicy,
    buildRequest,
    onResult,
    onClose
}: CyberVinciAiPromptPanelProps<TStructured>): React.ReactElement => {
    const [prompt, setPrompt] = React.useState(defaultPrompt);
    const [execution, setExecution] = React.useState<CyberVinciAiExecutionSelection>({
        reasoningPolicy: 'auto',
        reasoningEffort: 'medium'
    });
    const [running, setRunning] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();

    const submit = async (): Promise<void> => {
        if (!prompt.trim() || running) {
            return;
        }
        setRunning(true);
        setError(undefined);
        try {
            const request = buildRequest ? buildRequest({ prompt, execution }) : {
                surfaceId,
                action,
                workspacePath,
                userPrompt: prompt,
                systemPrompt,
                input,
                output,
                effectPolicy,
                execution
            };
            const result = await service.runTask<unknown, TStructured>({
                ...request,
                surfaceId: request.surfaceId ?? surfaceId,
                action: request.action ?? action,
                workspacePath: request.workspacePath ?? workspacePath,
                userPrompt: request.userPrompt ?? prompt,
                execution: {
                    ...execution,
                    ...request.execution
                }
            });
            await onResult(result);
        } catch (reason) {
            setError(String((reason as Error)?.message ?? reason));
        } finally {
            setRunning(false);
        }
    };

    return (
        <section className='cv-ai-runtime-prompt-panel'>
            <header>
                <h3>{title}</h3>
                {onClose ? (
                    <button type='button' className='cv-ai-runtime-icon-button' title='Close' onClick={onClose}>
                        <i className='codicon codicon-close' aria-hidden='true' />
                    </button>
                ) : undefined}
            </header>
            <CyberVinciAiExecutionPicker
                service={service}
                workspacePath={workspacePath}
                value={execution}
                disabled={running}
                onChange={setExecution}
            />
            <textarea
                value={prompt}
                disabled={running}
                placeholder={placeholder}
                onChange={event => setPrompt(event.currentTarget.value)}
            />
            {error ? <div className='cv-ai-runtime-error'>{error}</div> : undefined}
            <footer>
                <button type='button' className='theia-button secondary' disabled={running} onClick={onClose}>
                    Cancel
                </button>
                <button type='button' className='theia-button main' disabled={running || !prompt.trim()} onClick={submit}>
                    {running ? 'Running...' : 'Run AI'}
                </button>
            </footer>
        </section>
    );
};

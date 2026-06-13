// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as React from '@theia/core/shared/react';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService
} from '../../common';

export interface CyberVinciAiExecutionPickerProps {
    service: CyberVinciAiRuntimeService;
    workspacePath?: string;
    value?: CyberVinciAiExecutionSelection;
    disabled?: boolean;
    onChange: (selection: CyberVinciAiExecutionSelection) => void;
}

export const CyberVinciAiExecutionPicker: React.FC<CyberVinciAiExecutionPickerProps> = ({
    service,
    workspacePath,
    value,
    disabled,
    onChange
}) => {
    const [providers, setProviders] = React.useState<CyberVinciAiProviderDescriptor[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();

    React.useEffect(() => {
        let disposed = false;
        setLoading(true);
        service.listProviders({ workspacePath, includeUnavailable: true }).then(nextProviders => {
            if (disposed) {
                return;
            }
            setProviders(nextProviders);
            setError(undefined);
            if (!value?.providerId && nextProviders.length > 0) {
                const provider = nextProviders.find(candidate => candidate.available) ?? nextProviders[0];
                onChange({
                    ...value,
                    providerId: provider.id,
                    runtime: provider.runtime,
                    modelProvider: provider.modelProvider,
                    model: provider.defaultModel ?? provider.models?.[0],
                    reasoningPolicy: value?.reasoningPolicy ?? 'auto',
                    reasoningEffort: value?.reasoningEffort ?? 'medium'
                });
            }
        }).catch(reason => {
            if (!disposed) {
                setError(String(reason?.message ?? reason));
            }
        }).finally(() => {
            if (!disposed) {
                setLoading(false);
            }
        });
        return () => {
            disposed = true;
        };
    }, [service, workspacePath]);

    const provider = providers.find(candidate => candidate.id === value?.providerId) ?? providers[0];
    const models = provider?.models ?? [];

    const updateProvider = (providerId: string): void => {
        const next = providers.find(candidate => candidate.id === providerId);
        onChange({
            ...value,
            providerId,
            runtime: next?.runtime,
            modelProvider: next?.modelProvider,
            model: next?.defaultModel ?? next?.models?.[0] ?? value?.model,
            reasoningPolicy: value?.reasoningPolicy ?? 'auto',
            reasoningEffort: value?.reasoningEffort ?? 'medium'
        });
    };

    return (
        <div className='cv-ai-runtime-execution-picker'>
            <label>
                <span>Provider</span>
                <select
                    value={value?.providerId ?? provider?.id ?? ''}
                    disabled={disabled || loading || providers.length === 0}
                    onChange={event => updateProvider(event.currentTarget.value)}
                >
                    {providers.map(candidate => (
                        <option key={candidate.id} value={candidate.id}>
                            {candidate.label}{candidate.available ? '' : ' (unavailable)'}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                <span>Model</span>
                {models.length > 0 ? (
                    <select
                        value={value?.model ?? provider?.defaultModel ?? models[0] ?? ''}
                        disabled={disabled}
                        onChange={event => onChange({ ...value, model: event.currentTarget.value })}
                    >
                        {models.map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                ) : (
                    <input
                        value={value?.model ?? provider?.defaultModel ?? ''}
                        disabled={disabled}
                        onChange={event => onChange({ ...value, model: event.currentTarget.value })}
                    />
                )}
            </label>
            <label>
                <span>Reasoning</span>
                <select
                    value={value?.reasoningPolicy ?? 'auto'}
                    disabled={disabled}
                    onChange={event => onChange({ ...value, reasoningPolicy: event.currentTarget.value as CyberVinciAiExecutionSelection['reasoningPolicy'] })}
                >
                    <option value='auto'>Auto</option>
                    <option value='native'>Native</option>
                    <option value='virtual'>Virtual</option>
                    <option value='native_plus_virtual_light'>Native + virtual</option>
                    <option value='off'>Off</option>
                </select>
            </label>
            <label>
                <span>Effort</span>
                <select
                    value={value?.reasoningEffort ?? 'medium'}
                    disabled={disabled}
                    onChange={event => onChange({ ...value, reasoningEffort: event.currentTarget.value as CyberVinciAiExecutionSelection['reasoningEffort'] })}
                >
                    <option value='none'>None</option>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                    <option value='xhigh'>X High</option>
                </select>
            </label>
            {error ? <div className='cv-ai-runtime-error'>{error}</div> : undefined}
        </div>
    );
};

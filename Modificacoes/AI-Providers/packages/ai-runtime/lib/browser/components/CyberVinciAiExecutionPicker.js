"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAiExecutionPicker = void 0;
const React = require("@theia/core/shared/react");
const CyberVinciAiExecutionPicker = ({ service, workspacePath, value, disabled, onConfigureProvider, onSelectedProviderChange, onChange }) => {
    const [providers, setProviders] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState();
    const [reloadVersion, setReloadVersion] = React.useState(0);
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
    }, [service, workspacePath, reloadVersion]);
    const provider = providers.find(candidate => candidate.id === value?.providerId) ?? providers[0];
    const models = provider?.models ?? [];
    const modelMetadata = React.useMemo(() => new Map((provider?.modelMetadata ?? []).map(model => [model.id, model])), [provider?.modelMetadata]);
    const selectedModel = resolveCyberVinciSelectedModel(provider, value?.model, modelMetadata);
    const selectedModelMetadata = selectedModel ? modelMetadata.get(selectedModel) : undefined;
    const providerNeedsConfiguration = !!provider && (!provider.available || !!provider.configurationRequired?.length);
    const providerConfigurationKey = provider?.configurationRequired?.join('\n') ?? '';
    React.useEffect(() => {
        onSelectedProviderChange?.(provider);
    }, [onSelectedProviderChange, provider?.id, provider?.available, provider?.message, providerConfigurationKey]);
    const configureProvider = React.useCallback(async (target) => {
        if (!target || !onConfigureProvider) {
            return;
        }
        setLoading(true);
        try {
            await onConfigureProvider(target);
            setError(undefined);
            setReloadVersion(version => version + 1);
        }
        catch (reason) {
            setError(String(reason?.message ?? reason));
        }
        finally {
            setLoading(false);
        }
    }, [onConfigureProvider]);
    React.useEffect(() => {
        if (!provider || !models.length || !selectedModel || value?.model === selectedModel) {
            return;
        }
        onChange({
            ...value,
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            label: provider.label,
            executablePath: provider.executablePath,
            model: selectedModel
        });
    }, [provider?.id, models.join('\n'), selectedModel, value?.model]);
    const updateProvider = (providerId) => {
        const next = providers.find(candidate => candidate.id === providerId);
        onChange({
            ...value,
            providerId,
            runtime: next?.runtime,
            modelProvider: next?.modelProvider,
            model: next?.defaultModel ?? next?.models?.[0],
            reasoningPolicy: value?.reasoningPolicy ?? 'auto',
            reasoningEffort: value?.reasoningEffort ?? 'medium'
        });
        if (next && (!next.available || !!next.configurationRequired?.length)) {
            void configureProvider(next);
        }
    };
    return (React.createElement("div", { className: 'cv-ai-runtime-execution-picker' },
        React.createElement("div", { className: 'cv-ai-runtime-provider-cell' },
            React.createElement("label", null,
                React.createElement("span", null, "Provider"),
                React.createElement("select", { value: value?.providerId ?? provider?.id ?? '', disabled: disabled || loading || providers.length === 0, onChange: event => updateProvider(event.currentTarget.value) }, providers.map(candidate => (React.createElement("option", { key: candidate.id, value: candidate.id },
                    candidate.label,
                    candidate.available ? '' : ' (configure)'))))),
            onConfigureProvider && providerNeedsConfiguration ? (React.createElement("button", { type: 'button', className: 'theia-button secondary cv-ai-runtime-configure-provider', disabled: disabled || loading, onClick: () => configureProvider(provider) }, "Configure")) : undefined),
        React.createElement("label", null,
            React.createElement("span", null, "Model"),
            models.length > 0 ? (React.createElement("select", { value: selectedModel ?? '', disabled: disabled, onChange: event => onChange({ ...value, model: event.currentTarget.value }) }, models.map(model => {
                const metadata = modelMetadata.get(model);
                return React.createElement("option", { key: model, value: model, disabled: isCyberVinciModelUnavailable(metadata) }, formatCyberVinciModelLabel(model, metadata));
            }))) : (React.createElement("input", { value: value?.model ?? provider?.defaultModel ?? '', disabled: disabled, onChange: event => onChange({ ...value, model: event.currentTarget.value }) })),
            formatCyberVinciModelStatus(selectedModelMetadata) ? (React.createElement("span", { className: 'cv-ai-runtime-model-note' }, formatCyberVinciModelStatus(selectedModelMetadata))) : undefined),
        React.createElement("label", null,
            React.createElement("span", null, "Reasoning"),
            React.createElement("select", { value: value?.reasoningPolicy ?? 'auto', disabled: disabled, onChange: event => onChange({ ...value, reasoningPolicy: event.currentTarget.value }) },
                React.createElement("option", { value: 'auto' }, "Auto"),
                React.createElement("option", { value: 'native' }, "Native"),
                React.createElement("option", { value: 'virtual' }, "Virtual"),
                React.createElement("option", { value: 'native_plus_virtual_light' }, "Native + virtual"),
                React.createElement("option", { value: 'off' }, "Off"))),
        React.createElement("label", null,
            React.createElement("span", null, "Effort"),
            React.createElement("select", { value: value?.reasoningEffort ?? 'medium', disabled: disabled, onChange: event => onChange({ ...value, reasoningEffort: event.currentTarget.value }) },
                React.createElement("option", { value: 'none' }, "None"),
                React.createElement("option", { value: 'low' }, "Low"),
                React.createElement("option", { value: 'medium' }, "Medium"),
                React.createElement("option", { value: 'high' }, "High"),
                React.createElement("option", { value: 'xhigh' }, "X High"))),
        providerNeedsConfiguration ? (React.createElement("div", { className: 'cv-ai-runtime-provider-message' }, provider.configurationRequired?.length
            ? `Configuration required: ${provider.configurationRequired.join(', ')}`
            : provider.message ?? 'Configure this provider before running AI.')) : undefined,
        error ? React.createElement("div", { className: 'cv-ai-runtime-error' }, error) : undefined));
};
exports.CyberVinciAiExecutionPicker = CyberVinciAiExecutionPicker;
function formatCyberVinciModelLabel(model, metadata) {
    if (isCyberVinciModelUnavailable(metadata)) {
        return `${model} - Unavailable`;
    }
    const cost = metadata?.cost ? formatCyberVinciModelCost(metadata.cost) : undefined;
    return cost ? `${model} - ${cost}` : model;
}
function formatCyberVinciModelStatus(metadata) {
    if (isCyberVinciModelUnavailable(metadata)) {
        return metadata?.unavailableReason ? `Unavailable: ${metadata.unavailableReason}` : 'Unavailable';
    }
    return metadata?.cost ? formatCyberVinciModelCost(metadata.cost) : undefined;
}
function resolveCyberVinciSelectedModel(provider, selectedModel, modelMetadata) {
    const selected = selectedModel?.trim();
    const models = provider?.models?.map(model => model.trim()).filter(Boolean) ?? [];
    const isSelectable = (model) => !isCyberVinciModelUnavailable(modelMetadata.get(model));
    if (!models.length) {
        return selected || provider?.defaultModel;
    }
    if (selected && models.includes(selected) && isSelectable(selected)) {
        return selected;
    }
    const defaultModel = provider?.defaultModel?.trim();
    if (defaultModel && models.includes(defaultModel) && isSelectable(defaultModel)) {
        return defaultModel;
    }
    return models.find(isSelectable) ?? (selected && models.includes(selected) ? selected : models[0]);
}
function isCyberVinciModelUnavailable(metadata) {
    return !!metadata?.unavailable;
}
function formatCyberVinciModelCost(cost) {
    switch (cost) {
        case 'free':
            return 'Free';
        case 'free-limited':
            return 'Free limited';
        case 'included':
            return 'Included';
        case 'paid':
            return 'Paid';
        default:
            return 'Unknown cost';
    }
}
//# sourceMappingURL=CyberVinciAiExecutionPicker.js.map
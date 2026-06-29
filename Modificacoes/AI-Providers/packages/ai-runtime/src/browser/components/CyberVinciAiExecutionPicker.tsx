// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as React from '@theia/core/shared/react';
import * as ReactDOM from '@theia/core/shared/react-dom';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiModelMetadata,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService
} from '../../common';

export interface CyberVinciAiExecutionPickerProps {
    service: CyberVinciAiRuntimeService;
    workspacePath?: string;
    value?: CyberVinciAiExecutionSelection;
    disabled?: boolean;
    onConfigureProvider?: (provider: CyberVinciAiProviderDescriptor) => void | Promise<void>;
    onSelectedProviderChange?: (provider: CyberVinciAiProviderDescriptor | undefined) => void;
    onChange: (selection: CyberVinciAiExecutionSelection) => void;
}

export const CyberVinciAiExecutionPicker: React.FC<CyberVinciAiExecutionPickerProps> = ({
    service,
    workspacePath,
    value,
    disabled,
    onConfigureProvider,
    onSelectedProviderChange,
    onChange
}) => {
    const [providers, setProviders] = React.useState<CyberVinciAiProviderDescriptor[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();
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
    const selectedModelMetadata = selectedModel ? cyberVinciModelMetadataWithFallback(selectedModel, modelMetadata.get(selectedModel)) : undefined;
    const providerNeedsConfiguration = !!provider && (!provider.available || !!provider.configurationRequired?.length);
    const providerConfigurationKey = provider?.configurationRequired?.join('\n') ?? '';
    const [openMenu, setOpenMenu] = React.useState<CyberVinciAiRuntimeMenuKind>();
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const menuAnchorRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>();
    const reasoningEfforts = resolveCyberVinciReasoningEfforts(provider, selectedModel, selectedModelMetadata);
    const selectedEffort = resolveCyberVinciSelectedReasoningEffort(value, reasoningEfforts);
    const serviceTiers = resolveCyberVinciServiceTiers(provider, selectedModel, selectedModelMetadata);
    const selectedServiceTier = resolveCyberVinciSelectedServiceTier(value, serviceTiers);
    const reasoningVariants = resolveCyberVinciReasoningVariants(provider, selectedModel, selectedModelMetadata);
    const selectedVariant = resolveCyberVinciSelectedReasoningVariant(value, reasoningVariants);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpenMenu(undefined);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpenMenu(undefined);
            }
        };
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', closeOnEscape, true);
        return () => {
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('keydown', closeOnEscape, true);
        };
    }, []);

    React.useLayoutEffect(() => {
        if (!openMenu) {
            setMenuStyle(undefined);
            return;
        }
        const updateMenuStyle = (): void => {
            const anchor = menuAnchorRef.current;
            if (!anchor) {
                return;
            }
            setMenuStyle(positionCyberVinciRuntimeMenu(anchor.getBoundingClientRect(), cyberVinciRuntimeMenuWidth(openMenu), 420));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [openMenu]);

    React.useEffect(() => {
        onSelectedProviderChange?.(provider);
    }, [onSelectedProviderChange, provider?.id, provider?.available, provider?.message, providerConfigurationKey]);

    const configureProvider = React.useCallback(async (target: CyberVinciAiProviderDescriptor | undefined): Promise<void> => {
        if (!target || !onConfigureProvider) {
            return;
        }
        setLoading(true);
        try {
            await onConfigureProvider(target);
            setError(undefined);
            setReloadVersion(version => version + 1);
        } catch (reason) {
            setError(String((reason as Error)?.message ?? reason));
        } finally {
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

    const updateProvider = (providerId: string): void => {
        const next = providers.find(candidate => candidate.id === providerId);
        const nextSelection = normalizeCyberVinciRuntimeSelectionForProvider({
            ...value,
            providerId,
            runtime: next?.runtime,
            modelProvider: next?.modelProvider,
            model: next?.defaultModel ?? next?.models?.[0],
            reasoningPolicy: value?.reasoningPolicy ?? 'auto',
            reasoningEffort: value?.reasoningEffort ?? 'medium'
        }, next);
        setOpenMenu(undefined);
        onChange(nextSelection);
        if (next && (!next.available || !!next.configurationRequired?.length)) {
            void configureProvider(next);
        }
    };

    const updateModel = (model: string): void => {
        const metadata = modelMetadata.get(model);
        if (metadata?.unavailable) {
            void configureProvider(provider);
            return;
        }
        const nextEfforts = resolveCyberVinciReasoningEfforts(provider, model, metadata);
        const nextVariants = resolveCyberVinciReasoningVariants(provider, model, metadata);
        const nextTiers = resolveCyberVinciServiceTiers(provider, model, metadata);
        setOpenMenu(undefined);
        onChange({
            ...value,
            model,
            reasoningEffort: toCyberVinciExecutionReasoningEffort(resolveCyberVinciSelectedReasoningEffort(value, nextEfforts)),
            reasoningVariant: resolveCyberVinciSelectedReasoningVariant(value, nextVariants).id,
            reasoningVariantOptions: resolveCyberVinciSelectedReasoningVariant(value, nextVariants).options,
            serviceTier: toCyberVinciExecutionServiceTier(resolveCyberVinciSelectedServiceTier(value, nextTiers))
        });
    };

    const open = (menu: CyberVinciAiRuntimeMenuKind, event: React.MouseEvent<HTMLButtonElement>): void => {
        if (disabled) {
            return;
        }
        if (menu === 'provider' && openMenu !== menu) {
            setReloadVersion(version => version + 1);
        }
        menuAnchorRef.current = event.currentTarget;
        setOpenMenu(current => current === menu ? undefined : menu);
    };

    const menu = openMenu === 'provider' ? <div className='cv-ai-runtime-menu provider' style={menuStyle} ref={menuRef}>
        {providers.map(candidate => {
            const needsConfiguration = !candidate.available || !!candidate.configurationRequired?.length;
            return <button
                key={candidate.id}
                type='button'
                className={`cv-ai-runtime-menu-option provider${candidate.id === provider?.id ? ' selected' : ''}${needsConfiguration ? ' unavailable' : ''}`}
                onClick={() => updateProvider(candidate.id)}
            >
                <span className='cv-ai-runtime-menu-option-name'>{candidate.label}</span>
                <span className='cv-ai-runtime-menu-option-detail'>
                    {needsConfiguration
                        ? candidate.message ?? candidate.configurationRequired?.join(', ') ?? 'Configuration required'
                        : cyberVinciProviderRuntimeLabel(candidate)}
                </span>
            </button>;
        })}
    </div> : openMenu === 'model' ? <div className='cv-ai-runtime-menu model' style={menuStyle} ref={menuRef}>
        {models.map(model => {
            const metadata = cyberVinciModelMetadataWithFallback(model, modelMetadata.get(model));
            return <button
                key={model}
                type='button'
                className={`cv-ai-runtime-menu-option${model === selectedModel ? ' selected' : ''}${metadata?.unavailable ? ' unavailable' : ''}`}
                title={metadata?.unavailableReason}
                onClick={() => updateModel(model)}
            >
                <span className='cv-ai-runtime-menu-option-name'>{model}</span>
                <CyberVinciRuntimeModelBadges metadata={metadata} />
            </button>;
        })}
    </div> : openMenu === 'reasoning' ? <CyberVinciRuntimeCompactMenu
        style={menuStyle}
        refElement={menuRef}
        options={CYBERVINCI_REASONING_POLICY_OPTIONS}
        selected={value?.reasoningPolicy ?? 'auto'}
        onSelect={reasoningPolicy => {
            setOpenMenu(undefined);
            onChange({ ...value, reasoningPolicy: reasoningPolicy as CyberVinciAiExecutionSelection['reasoningPolicy'] });
        }}
    /> : openMenu === 'effort' ? <CyberVinciRuntimeCompactMenu
        style={menuStyle}
        refElement={menuRef}
        options={reasoningEfforts.map(effort => ({ value: effort, label: cyberVinciReasoningEffortLabel(effort) }))}
        selected={selectedEffort}
        onSelect={effort => {
            setOpenMenu(undefined);
            onChange({ ...value, reasoningEffort: toCyberVinciExecutionReasoningEffort(effort as CyberVinciRuntimeReasoningEffortOption) });
        }}
    /> : openMenu === 'variant' ? <CyberVinciRuntimeCompactMenu
        style={menuStyle}
        refElement={menuRef}
        options={reasoningVariants.map(variant => ({ value: variant.id, label: cyberVinciReasoningVariantLabel(variant.id, variant.label), icon: variant.id !== 'default' ? 'brain' : undefined }))}
        selected={selectedVariant.id}
        onSelect={variantId => {
            const variant = reasoningVariants.find(candidate => candidate.id === variantId) ?? selectedVariant;
            setOpenMenu(undefined);
            onChange({ ...value, reasoningVariant: variant.id, reasoningVariantOptions: variant.options });
        }}
    /> : openMenu === 'virtual' ? <CyberVinciRuntimeCompactMenu
        style={menuStyle}
        refElement={menuRef}
        options={CYBERVINCI_VIRTUAL_REASONING_OPTIONS}
        selected={value?.virtualReasoningMode ?? 'off'}
        onSelect={virtualReasoningMode => {
            setOpenMenu(undefined);
            onChange({ ...value, virtualReasoningMode: virtualReasoningMode as CyberVinciAiExecutionSelection['virtualReasoningMode'] });
        }}
    /> : openMenu === 'serviceTier' ? <CyberVinciRuntimeCompactMenu
        style={menuStyle}
        refElement={menuRef}
        options={serviceTiers.map(tier => ({ value: tier, label: cyberVinciServiceTierLabel(tier), icon: tier !== 'default' ? 'zap' : undefined }))}
        selected={selectedServiceTier}
        onSelect={tier => {
            setOpenMenu(undefined);
            onChange({ ...value, serviceTier: toCyberVinciExecutionServiceTier(tier as CyberVinciRuntimeServiceTier) });
        }}
    /> : undefined;

    return (
        <div className='cv-ai-runtime-execution-picker' ref={rootRef}>
            <CyberVinciRuntimePickerButton
                label='Provider'
                value={provider?.label ?? 'Provider'}
                disabled={disabled || loading || providers.length === 0}
                warning={providerNeedsConfiguration}
                onClick={event => open('provider', event)}
            />
            <CyberVinciRuntimePickerButton
                label='Model'
                value={selectedModel ?? value?.model ?? provider?.defaultModel ?? 'Provider default'}
                disabled={disabled || (!models.length && !provider)}
                warning={selectedModelMetadata?.unavailable}
                onClick={event => models.length ? open('model', event) : undefined}
            />
            {!models.length && <input
                className='cv-ai-runtime-model-input'
                value={value?.model ?? provider?.defaultModel ?? ''}
                disabled={disabled}
                placeholder='Model id'
                onChange={event => onChange({ ...value, model: event.currentTarget.value })}
            />}
            <CyberVinciRuntimePickerButton
                compact={true}
                icon='lightbulb'
                label='Reasoning'
                value={CYBERVINCI_REASONING_POLICY_OPTIONS.find(option => option.value === (value?.reasoningPolicy ?? 'auto'))?.label ?? 'Auto'}
                disabled={disabled}
                onClick={event => open('reasoning', event)}
            />
            <CyberVinciRuntimePickerButton
                compact={true}
                icon='lightbulb'
                label='Effort'
                value={cyberVinciReasoningEffortLabel(selectedEffort)}
                disabled={disabled || reasoningEfforts.length <= 1}
                onClick={event => open('effort', event)}
            />
            <CyberVinciRuntimePickerButton
                compact={true}
                productIcon='brain'
                label='Variant'
                value={cyberVinciReasoningVariantLabel(selectedVariant.id, selectedVariant.label)}
                disabled={disabled || reasoningVariants.length <= 1}
                onClick={event => open('variant', event)}
            />
            <CyberVinciRuntimePickerButton
                compact={true}
                icon='zap'
                label='Service tier'
                value={cyberVinciServiceTierLabel(selectedServiceTier)}
                disabled={disabled || serviceTiers.length <= 1}
                onClick={event => open('serviceTier', event)}
            />
            <CyberVinciRuntimePickerButton
                compact={true}
                icon='lightbulb'
                label='Virtual'
                value={CYBERVINCI_VIRTUAL_REASONING_OPTIONS.find(option => option.value === (value?.virtualReasoningMode ?? 'off'))?.label ?? 'Off'}
                disabled={disabled}
                onClick={event => open('virtual', event)}
            />
            {providerNeedsConfiguration ? (
                <div className='cv-ai-runtime-provider-message'>
                    {provider.configurationRequired?.length
                        ? `Configuration required: ${provider.configurationRequired.join(', ')}`
                        : provider.message ?? 'Configure this provider before running AI.'}
                </div>
            ) : undefined}
            {error ? <div className='cv-ai-runtime-error'>{error}</div> : undefined}
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </div>
    );
};

type CyberVinciAiRuntimeMenuKind = 'provider' | 'model' | 'reasoning' | 'effort' | 'variant' | 'virtual' | 'serviceTier';
type CyberVinciRuntimeReasoningEffortOption = 'default' | 'low' | 'medium' | 'high' | 'xhigh';
type CyberVinciRuntimeServiceTier = 'default' | 'fast' | 'flex';

interface CyberVinciRuntimeOption {
    value: string;
    label: string;
    icon?: string;
}

interface CyberVinciRuntimeReasoningVariant {
    id: string;
    label?: string;
    description?: string;
    options?: Record<string, unknown>;
    disabled?: boolean;
}

const CYBERVINCI_REASONING_POLICY_OPTIONS: CyberVinciRuntimeOption[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'native', label: 'Native' },
    { value: 'virtual', label: 'Virtual' },
    { value: 'native_plus_virtual_light', label: 'Native + virtual' },
    { value: 'off', label: 'Off' }
];

const CYBERVINCI_VIRTUAL_REASONING_OPTIONS: CyberVinciRuntimeOption[] = [
    { value: 'off', label: 'Off' },
    { value: 'auto', label: 'Auto' },
    { value: 'fast', label: 'Fast' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'deep', label: 'Deep' },
    { value: 'coding', label: 'Coding' },
    { value: 'research', label: 'Research' },
    { value: 'lats', label: 'LATS' }
];

const CYBERVINCI_REASONING_VARIANT_DEFAULT: CyberVinciRuntimeReasoningVariant = {
    id: 'default',
    label: 'Default',
    description: 'Use the provider and model default variant.'
};

const CyberVinciRuntimePickerButton: React.FC<{
    label: string;
    value: string;
    disabled?: boolean;
    compact?: boolean;
    warning?: boolean;
    icon?: string;
    productIcon?: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}> = props => (
    <button
        type='button'
        className={`cv-ai-runtime-picker-button${props.compact ? ' compact' : ''}${props.warning ? ' needs-configuration' : ''}${props.icon || props.productIcon ? ' has-leading-icon' : ''}`}
        disabled={props.disabled}
        title={`${props.label}: ${props.value}`}
        onClick={props.onClick}
    >
        {props.icon ? <span className={`codicon codicon-${props.icon}`} /> : undefined}
        {props.productIcon ? <span className={`cv-ai-runtime-model-icon capability cybervinci-product-icon cybervinci-product-icon-${props.productIcon}`} /> : undefined}
        <span className='cv-ai-runtime-picker-button-label'>{props.value}</span>
        <span className='codicon codicon-chevron-down' />
    </button>
);

function CyberVinciRuntimeCompactMenu(props: {
    style?: React.CSSProperties;
    refElement: React.MutableRefObject<HTMLDivElement | null>;
    options: CyberVinciRuntimeOption[];
    selected: string;
    onSelect: (value: string) => void;
}): React.ReactElement {
    return <div className='cv-ai-runtime-menu compact' style={props.style} ref={element => {
        props.refElement.current = element;
    }}>
        {props.options.map(option => <button
            key={option.value}
            type='button'
            className={`cv-ai-runtime-menu-option${option.value === props.selected ? ' selected' : ''}`}
            onClick={() => props.onSelect(option.value)}
        >
            <span className='cv-ai-runtime-menu-option-name'>{option.label}</span>
            {option.icon ? <span className={`codicon codicon-${option.icon}`} /> : undefined}
        </button>)}
    </div>;
}

const CyberVinciRuntimeModelBadges: React.FC<{ metadata: CyberVinciAiModelMetadata | undefined }> = ({ metadata }) => {
    const badges = cyberVinciModelBadges(metadata);
    if (!metadata) {
        return <span className='cv-ai-runtime-model-badges'><CyberVinciRuntimeCapabilityIcon label='Capabilities unknown' /></span>;
    }
    if (!badges.length) {
        return <span className='cv-ai-runtime-model-badges'><CyberVinciRuntimeCapabilityIcon label='Text only' /></span>;
    }
    return <span className='cv-ai-runtime-model-badges'>
        {badges.map(label => <CyberVinciRuntimeCapabilityIcon key={label} label={label} />)}
    </span>;
};

const CyberVinciRuntimeCapabilityIcon: React.FC<{ label: string }> = ({ label }) => (
    <span
        className={`cv-ai-runtime-model-icon ${cyberVinciBadgeTone(label)} cybervinci-product-icon cybervinci-product-icon-${cyberVinciBadgeIcon(label)}`}
        title={label}
        aria-label={label}
    />
);

function resolveCyberVinciSelectedModel(
    provider: CyberVinciAiProviderDescriptor | undefined,
    selectedModel: string | undefined,
    modelMetadata: Map<string, CyberVinciAiModelMetadata>
): string | undefined {
    const selected = selectedModel?.trim();
    const models = provider?.models?.map(model => model.trim()).filter(Boolean) ?? [];
    const isSelectable = (model: string): boolean => !isCyberVinciModelUnavailable(modelMetadata.get(model));
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

function isCyberVinciModelUnavailable(metadata: CyberVinciAiModelMetadata | undefined): boolean {
    return !!metadata?.unavailable;
}

function normalizeCyberVinciRuntimeSelectionForProvider(
    selection: CyberVinciAiExecutionSelection,
    provider: CyberVinciAiProviderDescriptor | undefined
): CyberVinciAiExecutionSelection {
    if (!provider) {
        return selection;
    }
    const metadataById = new Map((provider.modelMetadata ?? []).map(model => [model.id, model]));
    const model = resolveCyberVinciSelectedModel(provider, selection.model, metadataById);
    const metadata = model ? metadataById.get(model) : undefined;
    const effort = resolveCyberVinciSelectedReasoningEffort(selection, resolveCyberVinciReasoningEfforts(provider, model, metadata));
    const variant = resolveCyberVinciSelectedReasoningVariant(selection, resolveCyberVinciReasoningVariants(provider, model, metadata));
    const serviceTier = resolveCyberVinciSelectedServiceTier(selection, resolveCyberVinciServiceTiers(provider, model, metadata));
    return {
        ...selection,
        providerId: provider.id,
        runtime: provider.runtime,
        modelProvider: provider.modelProvider,
        label: provider.label,
        executablePath: provider.executablePath,
        model,
        reasoningPolicy: selection.reasoningPolicy ?? 'auto',
        reasoningEffort: toCyberVinciExecutionReasoningEffort(effort),
        reasoningVariant: variant.id,
        reasoningVariantOptions: variant.options,
        serviceTier: toCyberVinciExecutionServiceTier(serviceTier)
    };
}

function resolveCyberVinciReasoningEfforts(
    provider: CyberVinciAiProviderDescriptor | undefined,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): CyberVinciRuntimeReasoningEffortOption[] {
    if (!cyberVinciModelSupportsReasoning(metadata, model)) {
        return ['default'];
    }
    const normalizedModel = cyberVinciNormalizeModelFamily(model ?? metadata?.id ?? '');
    if (provider?.modelProvider === 'opencode-go' && /\b(deepseek|glm|kimi|qwen|minimax|mimo|big pickle)\b/.test(normalizedModel)) {
        return ['default'];
    }
    return cyberVinciSupportsXHigh(normalizedModel)
        ? ['default', 'low', 'medium', 'high', 'xhigh']
        : ['default', 'low', 'medium', 'high'];
}

function resolveCyberVinciSelectedReasoningEffort(
    selection: CyberVinciAiExecutionSelection | undefined,
    efforts: CyberVinciRuntimeReasoningEffortOption[]
): CyberVinciRuntimeReasoningEffortOption {
    const selected = selection?.reasoningEffort && selection.reasoningEffort !== 'none' ? selection.reasoningEffort : 'default';
    return efforts.includes(selected as CyberVinciRuntimeReasoningEffortOption) ? selected as CyberVinciRuntimeReasoningEffortOption : 'default';
}

function resolveCyberVinciReasoningVariants(
    provider: CyberVinciAiProviderDescriptor | undefined,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): CyberVinciRuntimeReasoningVariant[] {
    const configured = metadata?.variants ? Object.entries(metadata.variants)
        .map(([id, variant]) => normalizeCyberVinciReasoningVariant(id, variant))
        .filter((variant): variant is CyberVinciRuntimeReasoningVariant => !!variant && !variant.disabled) : [];
    if (configured.length) {
        return [CYBERVINCI_REASONING_VARIANT_DEFAULT, ...configured.filter(variant => variant.id !== CYBERVINCI_REASONING_VARIANT_DEFAULT.id)];
    }
    if (!cyberVinciModelSupportsReasoning(metadata, model)) {
        return [CYBERVINCI_REASONING_VARIANT_DEFAULT];
    }
    const normalizedModel = cyberVinciNormalizeModelFamily(model ?? metadata?.id ?? '');
    if (normalizedModel.includes('claude') || provider?.modelProvider?.includes('anthropic')) {
        return [
            CYBERVINCI_REASONING_VARIANT_DEFAULT,
            cyberVinciReasoningVariant('high', { thinking: { type: 'enabled', budgetTokens: 16000 } }, 'High thinking budget'),
            cyberVinciReasoningVariant('max', { thinking: { type: 'enabled', budgetTokens: 31999 } }, 'Maximum thinking budget')
        ];
    }
    if (normalizedModel.includes('gemini')) {
        return [
            CYBERVINCI_REASONING_VARIANT_DEFAULT,
            cyberVinciReasoningVariant('high', { thinkingConfig: { includeThoughts: true, thinkingBudget: 16000 } }),
            cyberVinciReasoningVariant('max', { thinkingConfig: { includeThoughts: true, thinkingBudget: 24576 } })
        ];
    }
    return [CYBERVINCI_REASONING_VARIANT_DEFAULT];
}

function normalizeCyberVinciReasoningVariant(id: string, value: unknown): CyberVinciRuntimeReasoningVariant | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const variant = value as CyberVinciRuntimeReasoningVariant;
    const normalizedId = variant.id?.trim() || id.trim();
    if (!normalizedId) {
        return undefined;
    }
    return {
        id: normalizedId,
        label: typeof variant.label === 'string' ? variant.label : cyberVinciReasoningVariantLabel(normalizedId),
        description: typeof variant.description === 'string' ? variant.description : undefined,
        options: cyberVinciReadRecord(variant.options) ?? cyberVinciReadRecord(value),
        disabled: variant.disabled
    };
}

function cyberVinciReasoningVariant(id: string, options: Record<string, unknown>, description?: string): CyberVinciRuntimeReasoningVariant {
    return {
        id,
        label: cyberVinciReasoningVariantLabel(id),
        description,
        options
    };
}

function resolveCyberVinciSelectedReasoningVariant(
    selection: CyberVinciAiExecutionSelection | undefined,
    variants: CyberVinciRuntimeReasoningVariant[]
): CyberVinciRuntimeReasoningVariant {
    const selectedId = selection?.reasoningVariant?.trim();
    return (selectedId ? variants.find(variant => variant.id === selectedId) : undefined)
        ?? variants[0]
        ?? CYBERVINCI_REASONING_VARIANT_DEFAULT;
}

function resolveCyberVinciServiceTiers(
    provider: CyberVinciAiProviderDescriptor | undefined,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): CyberVinciRuntimeServiceTier[] {
    const normalizedModel = cyberVinciNormalizeModelFamily(model ?? metadata?.id ?? '');
    const openAiLike = /\b(gpt|o[1-9]|codex)\b/.test(normalizedModel)
        || provider?.modelProvider === 'codex'
        || provider?.runtime === 'codex-app-server';
    if (provider?.runtime === 'codex-app-server' || (provider?.runtime === 'direct-http' && openAiLike)) {
        return ['default', 'fast', 'flex'];
    }
    return ['default'];
}

function resolveCyberVinciSelectedServiceTier(
    selection: CyberVinciAiExecutionSelection | undefined,
    tiers: CyberVinciRuntimeServiceTier[]
): CyberVinciRuntimeServiceTier {
    const selected = selection?.serviceTier ?? 'default';
    return tiers.includes(selected as CyberVinciRuntimeServiceTier) ? selected as CyberVinciRuntimeServiceTier : 'default';
}

function toCyberVinciExecutionReasoningEffort(effort: CyberVinciRuntimeReasoningEffortOption): CyberVinciAiExecutionSelection['reasoningEffort'] | undefined {
    return effort === 'default' ? undefined : effort;
}

function toCyberVinciExecutionServiceTier(tier: CyberVinciRuntimeServiceTier): CyberVinciAiExecutionSelection['serviceTier'] | undefined {
    return tier === 'default' ? undefined : tier as CyberVinciAiExecutionSelection['serviceTier'];
}

function cyberVinciModelSupportsReasoning(metadata: CyberVinciAiModelMetadata | undefined, model: string | undefined): boolean {
    if (metadata?.reasoning) {
        return true;
    }
    const supported = metadata?.supportedParameters?.map(parameter => parameter.toLowerCase()) ?? [];
    if (supported.some(parameter => parameter.includes('reasoning') || parameter.includes('thinking'))) {
        return true;
    }
    const normalized = cyberVinciNormalizeModelFamily(model ?? metadata?.id ?? '');
    return /\b(gpt|o[1-9]|codex|claude|gemini|grok)\b/.test(normalized);
}

function cyberVinciNormalizeModelFamily(model: string): string {
    const normalized = model.toLowerCase().replace(/^opencode-go\//, '').replace(/^opencode\//, '').replace(/^openrouter\//, '');
    return normalized.replace(/[:/._-]+/g, ' ');
}

function cyberVinciSupportsXHigh(normalizedModel: string): boolean {
    return /\b(gpt 5|codex|o3|o4)\b/.test(normalizedModel);
}

function cyberVinciReadRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value as Record<string, unknown>;
}

function cyberVinciDirectModelMetadata(id: string, cost: CyberVinciAiModelMetadata['cost'] | undefined): CyberVinciAiModelMetadata {
    const separator = id.indexOf('/');
    const normalized = id.toLowerCase();
    const isAnthropic = normalized.includes('claude');
    const isGemini = normalized.includes('gemini');
    const isImageCapable = isGemini || normalized.includes('gpt-5.5') || normalized.includes('gpt-5.4');
    return {
        id,
        cost,
        label: separator >= 0 ? id.slice(separator + 1) : id,
        provider: separator >= 0 ? id.slice(0, separator) : undefined,
        inputModalities: isImageCapable ? ['text', 'image'] : ['text'],
        outputModalities: normalized.includes('image') ? ['text', 'image'] : ['text'],
        supportedParameters: ['tools', 'tool_choice', 'response_format', 'temperature', 'reasoning'],
        contextLength: isGemini ? 1048576 : isAnthropic ? 200000 : 128000,
        attachment: isImageCapable,
        reasoning: true,
        toolCalling: true,
        structuredOutput: !isAnthropic,
        temperature: true
    };
}

function cyberVinciModelMetadataWithFallback(id: string, metadata: CyberVinciAiModelMetadata | undefined): CyberVinciAiModelMetadata {
    return {
        ...cyberVinciDirectModelMetadata(id, metadata?.cost),
        ...metadata,
        id
    };
}

function cyberVinciModelBadges(metadata: CyberVinciAiModelMetadata | undefined): string[] {
    if (!metadata) {
        return [];
    }
    return [
        metadata.unavailable ? 'Unavailable' : undefined,
        metadata.cost ? cyberVinciModelCost(metadata.cost) : undefined,
        metadata.contextLength ? cyberVinciContextLabel(metadata.contextLength) : undefined,
        cyberVinciSupportsInput(metadata, 'image') ? 'Vision' : undefined,
        cyberVinciSupportsOutput(metadata, 'image') ? 'Image Gen' : undefined,
        cyberVinciSupportsInput(metadata, 'pdf') ? 'PDF' : undefined,
        cyberVinciSupportsInput(metadata, 'audio') ? 'Audio' : undefined,
        cyberVinciSupportsInput(metadata, 'video') ? 'Video' : undefined,
        metadata.attachment ? 'Attachments' : undefined,
        metadata.reasoning ? 'Reasoning' : undefined,
        metadata.toolCalling ? 'Tools' : undefined,
        metadata.structuredOutput ? 'Structured' : undefined,
        metadata.temperature ? 'Temperature' : undefined,
        metadata.pricing?.inputCacheRead || metadata.pricing?.cachedRead ? 'Cache read' : undefined,
        metadata.pricing?.inputCacheWrite || metadata.pricing?.cachedWrite ? 'Cache write' : undefined
    ].filter((label): label is string => !!label);
}

function cyberVinciSupportsInput(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return cyberVinciSupportsModality(metadata?.inputModalities, modality);
}

function cyberVinciSupportsOutput(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return cyberVinciSupportsModality(metadata?.outputModalities, modality);
}

function cyberVinciSupportsModality(modalities: readonly string[] | undefined, modality: string): boolean {
    const expected = modality.toLowerCase();
    return modalities?.some(value => value.toLowerCase() === expected) ?? false;
}

function cyberVinciReasoningEffortLabel(effort: CyberVinciRuntimeReasoningEffortOption): string {
    switch (effort) {
        case 'low': return 'Low';
        case 'medium': return 'Medium';
        case 'high': return 'High';
        case 'xhigh': return 'X High';
        default: return 'Default';
    }
}

function cyberVinciReasoningVariantLabel(id: string, label?: string): string {
    const known: Record<string, string> = { default: 'Default', none: 'None', high: 'High', max: 'Max', thinking: 'Thinking' };
    return label || known[id] || id;
}

function cyberVinciServiceTierLabel(tier: CyberVinciRuntimeServiceTier): string {
    const known: Record<CyberVinciRuntimeServiceTier, string> = { default: 'Default', fast: 'Fast', flex: 'Flex' };
    return known[tier] ?? tier;
}

function cyberVinciModelCost(cost: NonNullable<CyberVinciAiModelMetadata['cost']>): string {
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

function cyberVinciContextLabel(contextLength: number): string {
    if (contextLength >= 1000000) {
        return `${Math.round(contextLength / 1000000)}M context`;
    }
    if (contextLength >= 1000) {
        return `${Math.round(contextLength / 1000)}K context`;
    }
    return `${contextLength} context`;
}

function cyberVinciProviderRuntimeLabel(provider: CyberVinciAiProviderDescriptor): string {
    if (provider.runtime === 'direct-http') {
        return 'Direct API';
    }
    if (provider.runtime === 'gemini-cli') {
        return 'Gemini CLI';
    }
    if (provider.runtime === 'claude-code-cli') {
        return 'Claude Code CLI';
    }
    if (provider.runtime === 'cursor-cli') {
        return 'Cursor CLI';
    }
    if (provider.runtime === 'opencode-cli') {
        return 'OpenCode CLI';
    }
    return 'Codex CLI app-server';
}

function cyberVinciRuntimeMenuWidth(menu: CyberVinciAiRuntimeMenuKind): number {
    if (menu === 'provider') {
        return 240;
    }
    if (menu === 'model') {
        return 420;
    }
    return 190;
}

function positionCyberVinciRuntimeMenu(rect: DOMRect, width: number, maxHeight: number): React.CSSProperties {
    const gap = 4;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const belowTop = rect.bottom + gap;
    const spaceBelow = window.innerHeight - belowTop - 8;
    if (spaceBelow >= 160 || rect.top < window.innerHeight / 2) {
        return {
            left,
            top: belowTop,
            width,
            maxHeight: Math.min(maxHeight, Math.max(120, spaceBelow))
        };
    }
    const spaceAbove = rect.top - 8 - gap;
    return {
        left,
        top: Math.max(8, rect.top - Math.min(maxHeight, spaceAbove) - gap),
        width,
        maxHeight: Math.min(maxHeight, Math.max(120, spaceAbove))
    };
}

function cyberVinciBadgeTone(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('free') || normalized === 'included') {
        return 'free';
    }
    if (normalized.includes('paid') || normalized.includes('unavailable')) {
        return 'paid';
    }
    if (normalized.includes('vision') || normalized.includes('image')) {
        return 'vision';
    }
    if (normalized.includes('video') || normalized.includes('audio') || normalized.includes('pdf')) {
        return 'media';
    }
    if (normalized.includes('unknown')) {
        return 'unknown';
    }
    if (normalized.includes('text only')) {
        return 'muted';
    }
    return 'capability';
}

function cyberVinciBadgeIcon(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('free') || normalized.includes('paid') || normalized === 'included') {
        return 'dollar-sign';
    }
    if (normalized.includes('unavailable')) {
        return 'ban';
    }
    if (normalized.includes('vision')) {
        return 'eye';
    }
    if (normalized.includes('image')) {
        return 'file-image';
    }
    if (normalized.includes('pdf') || normalized.includes('attachment')) {
        return 'file-type-2';
    }
    if (normalized.includes('audio')) {
        return 'volume-2';
    }
    if (normalized.includes('video')) {
        return 'video';
    }
    if (normalized.includes('context') || normalized.includes('cache')) {
        return 'workflow';
    }
    if (normalized.includes('temperature')) {
        return 'workflow';
    }
    if (normalized.includes('reasoning')) {
        return 'brain';
    }
    if (normalized.includes('tools')) {
        return 'wrench';
    }
    if (normalized.includes('structured')) {
        return 'braces';
    }
    if (normalized.includes('unknown')) {
        return 'message-circle';
    }
    return 'workflow';
}

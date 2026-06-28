import * as React from '@theia/core/shared/react';
import { createRoot, Root } from '@theia/core/shared/react-dom/client';
import { CyberVinciAiExecutionPicker } from '@cybervinci/ai-runtime/lib/browser/components';
import type {
    CyberVinciAiExecutionSelection,
    CyberVinciAiModelMetadata,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService
} from '@cybervinci/ai-runtime/lib/common';

export type OpenPencilAiImageMode = 'off' | 'search' | 'generate' | 'auto';

export interface OpenPencilAiPromptImagePolicy {
    readonly mode: OpenPencilAiImageMode;
    readonly maxAssets: number;
    readonly cacheImagesLocally: boolean;
}

export interface OpenPencilAiVisualReferencePolicy {
    readonly mode: 'off' | 'auto';
    readonly referenceUrl?: string;
    readonly visualModelEnabled?: boolean;
    readonly visualProviderId?: string;
    readonly visualProvider?: CyberVinciAiProviderDescriptor;
    readonly visualModel?: string;
    readonly visualShowAllModels?: boolean;
    readonly targetScore: number;
    readonly maxPasses: number;
}

export interface OpenPencilAiPromptDialogAnchorRect {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly width: number;
    readonly height: number;
}

export interface OpenPencilAiPromptDialogResult {
    readonly prompt: string;
    readonly providerId?: string;
    readonly provider?: CyberVinciAiProviderDescriptor;
    readonly model?: string;
    readonly reasoningEffort: NonNullable<CyberVinciAiExecutionSelection['reasoningEffort']>;
    readonly imagePolicy: OpenPencilAiPromptImagePolicy;
    readonly visualReference: OpenPencilAiVisualReferencePolicy;
    readonly defaultExecution?: CyberVinciAiExecutionSelection;
}

export interface OpenPencilAiPromptProviderState {
    readonly providers: CyberVinciAiProviderDescriptor[];
    readonly defaultExecution?: CyberVinciAiExecutionSelection;
}

export interface OpenPencilAiPromptDialogOptions {
    readonly title: string;
    readonly prompt: string;
    readonly value: string;
    readonly providers?: CyberVinciAiProviderDescriptor[];
    readonly defaultExecution?: CyberVinciAiExecutionSelection;
    readonly providerState?: Promise<OpenPencilAiPromptProviderState>;
    readonly runtimeService?: CyberVinciAiRuntimeService;
    readonly workspacePath?: string;
    readonly configureProvider?: (provider: CyberVinciAiProviderDescriptor) => Promise<OpenPencilAiPromptProviderState | undefined>;
    readonly anchorRect?: OpenPencilAiPromptDialogAnchorRect;
}

interface SavedOpenPencilAiPromptDefaults {
    readonly providerId?: string;
    readonly model?: string;
    readonly reasoningEffort?: NonNullable<CyberVinciAiExecutionSelection['reasoningEffort']>;
    readonly imageMode?: OpenPencilAiImageMode;
    readonly visualModelEnabled?: boolean;
    readonly visualProviderId?: string;
    readonly visualModel?: string;
    readonly visualShowAllModels?: boolean;
}

const OPENPENCIL_AI_PROMPT_DIALOG_STORAGE_KEY = 'openpencil.aiPromptDialog.defaults.v1';

const OPENPENCIL_AI_REASONING_OPTIONS: Array<{
    value: NonNullable<CyberVinciAiExecutionSelection['reasoningEffort']>;
    label: string;
}> = [
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
    { value: 'xhigh', label: 'XHigh' },
    { value: 'none', label: 'None' }
];

const OPENPENCIL_AI_IMAGE_OPTIONS: Array<{
    value: OpenPencilAiImageMode;
    label: string;
}> = [
    { value: 'off', label: 'Off' },
    { value: 'search', label: 'Search real images' },
    { value: 'generate', label: 'Generate images' },
    { value: 'auto', label: 'Auto' }
];

export function openOpenPencilAiPromptDialog(options: OpenPencilAiPromptDialogOptions): Promise<OpenPencilAiPromptDialogResult | undefined> {
    return new Promise(resolve => {
        const saved = readSavedOpenPencilAiPromptDefaults();
        let providers = options.providers ?? [];
        let defaultExecution = options.defaultExecution;
        let loadingProviders = !!options.providerState && !options.runtimeService;
        let runtimeExecution: CyberVinciAiExecutionSelection = createOpenPencilRuntimeExecution(defaultExecution, saved);
        let runtimeSelectedProvider: CyberVinciAiProviderDescriptor | undefined;
        let runtimeRoot: Root | undefined;

        const layer = document.createElement('div');
        layer.className = 'openpencil-ai-prompt-popover-layer';

        const panel = document.createElement('form');
        panel.className = 'openpencil-ai-prompt-dialog';
        panel.setAttribute('aria-label', options.title);

        const promptInput = document.createElement('textarea');
        promptInput.className = 'openpencil-ai-prompt-dialog-input';
        promptInput.rows = 4;
        promptInput.value = options.value;
        promptInput.placeholder = options.prompt;
        promptInput.setAttribute('aria-label', options.prompt);
        panel.appendChild(promptInput);

        const fields = document.createElement('div');
        fields.className = 'openpencil-ai-prompt-dialog-fields';

        const runtimePickerHost = document.createElement('div');
        runtimePickerHost.className = 'openpencil-ai-runtime-picker-host';

        const providerSelect = document.createElement('select');
        providerSelect.className = 'openpencil-ai-prompt-dialog-select';
        providerSelect.setAttribute('aria-label', 'Provider');

        const modelSelect = document.createElement('select');
        modelSelect.className = 'openpencil-ai-prompt-dialog-select openpencil-ai-prompt-dialog-model-native';
        modelSelect.setAttribute('aria-label', 'Model');

        const modelPicker = document.createElement('div');
        modelPicker.className = 'openpencil-ai-model-picker';
        const modelButton = document.createElement('button');
        modelButton.type = 'button';
        modelButton.className = 'openpencil-ai-model-picker-button';
        modelButton.setAttribute('aria-haspopup', 'listbox');
        modelButton.setAttribute('aria-expanded', 'false');
        const modelButtonLabel = document.createElement('span');
        modelButtonLabel.className = 'openpencil-ai-model-picker-label';
        const modelButtonCaret = createControlCaret('openpencil-ai-model-picker-caret');
        modelButton.append(modelButtonLabel, modelButtonCaret);
        const modelMenu = document.createElement('div');
        modelMenu.className = 'openpencil-ai-model-picker-menu';
        modelMenu.setAttribute('role', 'listbox');
        modelMenu.hidden = true;
        modelPicker.append(modelSelect, modelButton, modelMenu);

        const reasoningSelect = document.createElement('select');
        reasoningSelect.className = 'openpencil-ai-prompt-dialog-select';
        reasoningSelect.setAttribute('aria-label', 'Reasoning');
        for (const option of OPENPENCIL_AI_REASONING_OPTIONS) {
            appendSelectOption(reasoningSelect, option.value, option.label);
        }
        reasoningSelect.value = saved.reasoningEffort ?? defaultExecution?.reasoningEffort ?? 'medium';

        const imageSelect = document.createElement('select');
        imageSelect.className = 'openpencil-ai-prompt-dialog-select';
        imageSelect.setAttribute('aria-label', 'Images');
        for (const option of OPENPENCIL_AI_IMAGE_OPTIONS) {
            appendSelectOption(imageSelect, option.value, option.label);
        }
        imageSelect.value = saved.imageMode ?? 'off';

        if (options.runtimeService) {
            panel.appendChild(runtimePickerHost);
            fields.classList.add('compact');
        } else {
            fields.appendChild(createDialogField('Provider', createSelectShell(providerSelect)));
            fields.appendChild(createDialogField('Model', modelPicker, 'openpencil-ai-prompt-dialog-model-field'));
            fields.appendChild(createDialogField('Reasoning', createSelectShell(reasoningSelect)));
        }
        fields.appendChild(createDialogField('Images', createSelectShell(imageSelect)));
        panel.appendChild(fields);

        const selectedModelBadges = document.createElement('div');
        selectedModelBadges.className = 'openpencil-ai-model-selected-badges';
        selectedModelBadges.hidden = !!options.runtimeService;
        panel.appendChild(selectedModelBadges);

        const visualReferenceRow = document.createElement('label');
        visualReferenceRow.className = 'openpencil-ai-visual-reference-row';
        const visualReferenceLabel = document.createElement('span');
        visualReferenceLabel.textContent = 'Reference';
        const visualReferenceInput = document.createElement('input');
        visualReferenceInput.className = 'openpencil-ai-visual-reference-input';
        visualReferenceInput.type = 'url';
        visualReferenceInput.placeholder = 'Optional image URL/data URL';
        visualReferenceInput.setAttribute('aria-label', 'Reference image URL for visual comparison');
        visualReferenceRow.append(visualReferenceLabel, visualReferenceInput);
        panel.appendChild(visualReferenceRow);

        const visualJudgeRow = document.createElement('div');
        visualJudgeRow.className = 'openpencil-ai-visual-judge-row';
        const visualJudgeToggleLabel = document.createElement('label');
        visualJudgeToggleLabel.className = 'openpencil-ai-visual-judge-toggle';
        const visualJudgeToggle = document.createElement('input');
        visualJudgeToggle.type = 'checkbox';
        visualJudgeToggle.checked = saved.visualModelEnabled === true;
        visualJudgeToggle.setAttribute('aria-label', 'Use a separate vision model');
        const visualJudgeToggleText = document.createElement('span');
        visualJudgeToggleText.textContent = 'Vision judge';
        visualJudgeToggleLabel.append(visualJudgeToggle, visualJudgeToggleText);
        const visualProviderSelect = document.createElement('select');
        visualProviderSelect.className = 'openpencil-ai-prompt-dialog-select openpencil-ai-visual-provider-select';
        visualProviderSelect.setAttribute('aria-label', 'Vision judge provider');
        const visualModelSelect = document.createElement('select');
        visualModelSelect.className = 'openpencil-ai-prompt-dialog-select openpencil-ai-prompt-dialog-model-native openpencil-ai-visual-model-select';
        visualModelSelect.setAttribute('aria-label', 'Vision judge model');
        const visualModelPicker = document.createElement('div');
        visualModelPicker.className = 'openpencil-ai-model-picker openpencil-ai-visual-model-picker';
        const visualModelButton = document.createElement('button');
        visualModelButton.type = 'button';
        visualModelButton.className = 'openpencil-ai-model-picker-button';
        visualModelButton.setAttribute('aria-haspopup', 'listbox');
        visualModelButton.setAttribute('aria-expanded', 'false');
        const visualModelButtonLabel = document.createElement('span');
        visualModelButtonLabel.className = 'openpencil-ai-model-picker-label';
        const visualModelButtonBadges = document.createElement('span');
        visualModelButtonBadges.className = 'openpencil-ai-model-picker-option-badges';
        const visualModelButtonCaret = createControlCaret('openpencil-ai-model-picker-caret');
        visualModelButton.append(visualModelButtonLabel, visualModelButtonBadges, visualModelButtonCaret);
        const visualModelMenu = document.createElement('div');
        visualModelMenu.className = 'openpencil-ai-model-picker-menu';
        visualModelMenu.setAttribute('role', 'listbox');
        visualModelMenu.hidden = true;
        visualModelPicker.append(visualModelSelect, visualModelButton, visualModelMenu);
        const visualShowAllLabel = document.createElement('label');
        visualShowAllLabel.className = 'openpencil-ai-visual-show-all';
        const visualShowAllInput = document.createElement('input');
        visualShowAllInput.type = 'checkbox';
        visualShowAllInput.checked = saved.visualShowAllModels === true;
        visualShowAllInput.setAttribute('aria-label', 'Show all vision judge models');
        const visualShowAllText = document.createElement('span');
        visualShowAllText.textContent = 'All models';
        visualShowAllLabel.append(visualShowAllInput, visualShowAllText);
        visualJudgeRow.append(visualJudgeToggleLabel, createSelectShell(visualProviderSelect), visualModelPicker, visualShowAllLabel);
        panel.appendChild(visualJudgeRow);

        const details = document.createElement('div');
        details.className = 'openpencil-ai-prompt-dialog-details';
        panel.appendChild(details);

        const error = document.createElement('div');
        error.className = 'openpencil-ai-prompt-dialog-error';
        error.setAttribute('role', 'alert');
        panel.appendChild(error);

        const actions = document.createElement('div');
        actions.className = 'openpencil-ai-prompt-dialog-actions';

        const configureButton = document.createElement('button');
        configureButton.type = 'button';
        configureButton.className = 'theia-button secondary openpencil-ai-prompt-dialog-configure';
        configureButton.textContent = 'Configure';
        configureButton.hidden = true;
        actions.appendChild(configureButton);

        const actionSpacer = document.createElement('span');
        actionSpacer.className = 'openpencil-ai-prompt-dialog-action-spacer';
        actions.appendChild(actionSpacer);

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'theia-button openpencil-ai-prompt-dialog-cancel';
        cancelButton.textContent = 'Cancel';
        actions.appendChild(cancelButton);

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'theia-button main openpencil-ai-prompt-dialog-submit';
        const submitButtonLabel = document.createElement('span');
        submitButtonLabel.textContent = 'Run AI';
        submitButton.append(createOpenPencilAiSparklesIcon(), submitButtonLabel);
        actions.appendChild(submitButton);
        panel.appendChild(actions);

        const close = (result: OpenPencilAiPromptDialogResult | undefined): void => {
            document.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('resize', reposition, true);
            window.removeEventListener('scroll', reposition, true);
            runtimeRoot?.unmount();
            layer.remove();
            resolve(result);
        };

        const rememberRuntimeProvider = (provider: CyberVinciAiProviderDescriptor | undefined): void => {
            if (!provider) {
                return;
            }
            const index = providers.findIndex(candidate => candidate.id === provider.id);
            providers = index >= 0
                ? providers.map(candidate => candidate.id === provider.id ? provider : candidate)
                : [provider, ...providers];
        };
        const selectedProvider = (): CyberVinciAiProviderDescriptor | undefined => options.runtimeService
            ? runtimeSelectedProvider ?? providers.find(provider => provider.id === runtimeExecution.providerId)
            : providers.find(provider => provider.id === providerSelect.value);
        const selectedVisualProvider = (): CyberVinciAiProviderDescriptor | undefined =>
            providers.find(provider => provider.id === visualProviderSelect.value) ?? selectedProvider();
        const selectedModelValue = (): string => options.runtimeService ? runtimeExecution.model?.trim() ?? '' : modelSelect.value.trim();
        const selectedModelMetadata = (): CyberVinciAiModelMetadata | undefined => {
            const modelId = selectedModelValue();
            if (!modelId) {
                return undefined;
            }
            return selectedProvider()?.modelMetadata?.find(model => model.id === modelId);
        };
        const providerNeedsConfiguration = (provider: CyberVinciAiProviderDescriptor | undefined): boolean =>
            !!provider && (!provider.available || !!provider.configurationRequired?.length);
        const selectedProviderCanRun = (): boolean => {
            if (options.runtimeService) {
                const provider = selectedProvider();
                return !!runtimeExecution.providerId && !!provider && !providerNeedsConfiguration(provider);
            }
            if (loadingProviders) {
                return false;
            }
            const provider = selectedProvider();
            return !!provider && !providerNeedsConfiguration(provider);
        };
        const selectedModelCanRun = (): boolean => {
            if (options.runtimeService) {
                const provider = selectedProvider();
                if (!provider) {
                    return false;
                }
                const models = provider.models ?? [];
                if (!models.length) {
                    return !!selectedModelValue() || !!provider.defaultModel;
                }
                return !!selectedModelValue() && !isOpenPencilAiModelUnavailable(selectedModelMetadata());
            }
            return modelSelect.disabled || (!!modelSelect.value.trim() && !isOpenPencilAiModelUnavailable(selectedModelMetadata()));
        };
        const closeModelMenu = (): void => {
            modelMenu.hidden = true;
            modelButton.setAttribute('aria-expanded', 'false');
        };
        const closeVisualModelMenu = (): void => {
            visualModelMenu.hidden = true;
            visualModelButton.setAttribute('aria-expanded', 'false');
        };
        const openModelMenu = (): void => {
            if (modelButton.disabled) {
                return;
            }
            modelMenu.hidden = false;
            modelButton.setAttribute('aria-expanded', 'true');
            positionOpenPencilAiModelMenu(modelButton, modelMenu);
        };
        const toggleModelMenu = (): void => {
            if (modelMenu.hidden) {
                openModelMenu();
            } else {
                closeModelMenu();
            }
        };
        const openVisualModelMenu = (): void => {
            if (visualModelButton.disabled) {
                return;
            }
            visualModelMenu.hidden = false;
            visualModelButton.setAttribute('aria-expanded', 'true');
            positionOpenPencilAiModelMenu(visualModelButton, visualModelMenu);
        };
        const toggleVisualModelMenu = (): void => {
            if (visualModelMenu.hidden) {
                openVisualModelMenu();
            } else {
                closeVisualModelMenu();
            }
        };
        const refreshSelectedModelBadges = (): void => {
            selectedModelBadges.replaceChildren();
            const metadata = selectedModelMetadata();
            const badges = formatOpenPencilAiModelBadges(metadata);
            if (!metadata) {
                appendModelCapabilityIcon(selectedModelBadges, 'Capabilities unknown', 'unknown');
            } else if (!badges.length) {
                appendModelCapabilityIcon(selectedModelBadges, 'Text only', 'muted');
            } else {
                for (const badge of badges) {
                    appendModelCapabilityIcon(selectedModelBadges, badge, modelBadgeTone(badge));
                }
            }
        };
        const refreshVisualReferenceVisibility = (): void => {
            visualReferenceRow.hidden = false;
            visualJudgeRow.hidden = false;
            visualProviderSelect.disabled = !visualJudgeToggle.checked || !visualProviderSelect.options.length;
            visualModelSelect.disabled = !visualJudgeToggle.checked || !visualModelSelect.options.length;
            visualModelButton.disabled = visualModelSelect.disabled;
            visualShowAllInput.disabled = !visualJudgeToggle.checked || !visualProviderSelect.options.length;
        };
        const selectedVisualModelMetadata = (): CyberVinciAiModelMetadata | undefined => {
            const modelId = visualModelSelect.value.trim();
            if (!modelId) {
                return undefined;
            }
            return selectedVisualProvider()?.modelMetadata?.find(model => model.id === modelId);
        };
        const refreshVisualModelPickerButton = (): void => {
            const model = visualModelSelect.value.trim();
            const metadata = selectedVisualModelMetadata();
            visualModelButton.disabled = visualModelSelect.disabled;
            visualModelButtonLabel.textContent = model || 'No vision model';
            visualModelButtonBadges.replaceChildren();
            if (!model) {
                return;
            }
            const badges = formatOpenPencilAiModelBadges(metadata);
            if (!metadata) {
                appendModelCapabilityIcon(visualModelButtonBadges, 'Capabilities unknown', 'unknown');
            } else if (!badges.length) {
                appendModelCapabilityIcon(visualModelButtonBadges, 'Text only', 'muted');
            } else {
                for (const badge of badges) {
                    appendModelCapabilityIcon(visualModelButtonBadges, badge, modelBadgeTone(badge));
                }
            }
        };
        const refreshModelPickerButton = (): void => {
            const model = modelSelect.value.trim();
            modelButton.disabled = modelSelect.disabled;
            modelButtonLabel.textContent = model || 'Provider default';
            refreshSelectedModelBadges();
            refreshVisualReferenceVisibility();
        };
        const renderModelPickerMenu = (): void => {
            modelMenu.replaceChildren();
            const provider = selectedProvider();
            const metadataById = new Map((provider?.modelMetadata ?? []).map(model => [model.id, model]));
            const options = Array.from(modelSelect.options).filter(option => !!option.value.trim());
            if (!options.length) {
                const empty = document.createElement('div');
                empty.className = 'openpencil-ai-model-picker-empty';
                empty.textContent = 'Provider default';
                modelMenu.appendChild(empty);
                refreshModelPickerButton();
                return;
            }
            for (const option of options) {
                const metadata = metadataById.get(option.value);
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'openpencil-ai-model-picker-option';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', option.value === modelSelect.value ? 'true' : 'false');
                item.disabled = option.disabled;
                if (option.disabled) {
                    item.classList.add('unavailable');
                    item.title = metadata?.unavailableReason ?? 'This model is unavailable for the selected provider/account.';
                }
                if (option.value === modelSelect.value) {
                    item.classList.add('selected');
                }
                const name = document.createElement('span');
                name.className = 'openpencil-ai-model-picker-option-name';
                name.textContent = option.value;
                const badges = document.createElement('span');
                badges.className = 'openpencil-ai-model-picker-option-badges';
                for (const badge of formatOpenPencilAiModelBadges(metadata)) {
                    appendModelCapabilityIcon(badges, badge, modelBadgeTone(badge));
                }
                item.append(name, badges);
                item.addEventListener('click', () => {
                    modelSelect.value = option.value;
                    modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    closeModelMenu();
                });
                modelMenu.appendChild(item);
            }
            refreshModelPickerButton();
            if (!modelMenu.hidden) {
                positionOpenPencilAiModelMenu(modelButton, modelMenu);
            }
        };
        const renderVisualModelPickerMenu = (): void => {
            visualModelMenu.replaceChildren();
            const provider = selectedVisualProvider();
            const metadataById = new Map((provider?.modelMetadata ?? []).map(model => [model.id, model]));
            const options = Array.from(visualModelSelect.options).filter(option => !!option.value.trim());
            if (!options.length) {
                const empty = document.createElement('div');
                empty.className = 'openpencil-ai-model-picker-empty';
                empty.textContent = 'No matching vision model';
                visualModelMenu.appendChild(empty);
                refreshVisualModelPickerButton();
                return;
            }
            for (const option of options) {
                const metadata = metadataById.get(option.value);
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'openpencil-ai-model-picker-option';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', option.value === visualModelSelect.value ? 'true' : 'false');
                if (option.value === visualModelSelect.value) {
                    item.classList.add('selected');
                }
                const name = document.createElement('span');
                name.className = 'openpencil-ai-model-picker-option-name';
                name.textContent = option.value;
                const badges = document.createElement('span');
                badges.className = 'openpencil-ai-model-picker-option-badges';
                const modelBadges = formatOpenPencilAiModelBadges(metadata);
                if (!metadata) {
                    appendModelCapabilityIcon(badges, 'Capabilities unknown', 'unknown');
                } else if (!modelBadges.length) {
                    appendModelCapabilityIcon(badges, 'Text only', 'muted');
                } else {
                    for (const badge of modelBadges) {
                        appendModelCapabilityIcon(badges, badge, modelBadgeTone(badge));
                    }
                }
                item.append(name, badges);
                item.addEventListener('click', () => {
                    visualModelSelect.value = option.value;
                    visualModelSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    closeVisualModelMenu();
                });
                visualModelMenu.appendChild(item);
            }
            refreshVisualModelPickerButton();
            if (!visualModelMenu.hidden) {
                positionOpenPencilAiModelMenu(visualModelButton, visualModelMenu);
            }
        };
        const refreshSubmitState = (): void => {
            const promptReady = !!promptInput.value.trim();
            const provider = selectedProvider();
            const providerReady = selectedProviderCanRun();
            const modelReady = selectedModelCanRun();
            submitButton.disabled = !promptReady || !providerReady || !modelReady;
            submitButton.title = !promptReady
                ? 'Enter a prompt before running Canvas AI.'
                : providerReady
                    ? modelReady
                        ? ''
                        : 'Choose an available model before running Canvas AI.'
                    : provider
                        ? 'Configure this provider before running Canvas AI.'
                        : 'Load an available provider before running Canvas AI.';
        };

        const refreshDetails = (): void => {
            const provider = selectedProvider();
            const needsConfiguration = providerNeedsConfiguration(provider);
            configureButton.hidden = !!options.runtimeService || !needsConfiguration || !options.configureProvider;
            if (loadingProviders) {
                details.textContent = 'Loading providers and models...';
                refreshSubmitState();
                return;
            }
            if (!provider) {
                details.textContent = providers.length
                    ? 'Using the default Canvas AI provider.'
                    : 'Provider list is unavailable; load or configure a provider before running Canvas AI.';
                refreshSubmitState();
                return;
            }
            const capabilityLabels = [
                provider.capabilities?.webSearch ? 'web search' : undefined,
                provider.capabilities?.imageGeneration ? 'image generation' : undefined
            ].filter(Boolean);
            const freeModelCount = provider.modelMetadata?.filter(model => !isOpenPencilAiModelUnavailable(model) && (model.cost === 'free' || model.cost === 'free-limited')).length ?? 0;
            const includedModelCount = provider.modelMetadata?.filter(model => !isOpenPencilAiModelUnavailable(model) && model.cost === 'included').length ?? 0;
            const visionModelCount = provider.modelMetadata?.filter(modelSupportsVisionInput).length ?? 0;
            const imageOutputModelCount = provider.modelMetadata?.filter(modelSupportsImageOutput).length ?? 0;
            const unavailableModelCount = provider.modelMetadata?.filter(isOpenPencilAiModelUnavailable).length ?? 0;
            const selectedModelUnavailableReason = selectedModelMetadata()?.unavailableReason;
            const requirements = provider.configurationRequired?.length ? `Needs: ${provider.configurationRequired.join(', ')}` : undefined;
            details.textContent = [
                provider.available ? 'Available' : 'Unavailable',
                provider.message,
                requirements,
                selectedModelUnavailableReason ? `Model unavailable: ${selectedModelUnavailableReason}` : undefined,
                freeModelCount ? `${freeModelCount} free model${freeModelCount === 1 ? '' : 's'}` : undefined,
                includedModelCount ? `${includedModelCount} included model${includedModelCount === 1 ? '' : 's'}` : undefined,
                visionModelCount ? `${visionModelCount} vision model${visionModelCount === 1 ? '' : 's'}` : undefined,
                imageOutputModelCount ? `${imageOutputModelCount} image-gen model${imageOutputModelCount === 1 ? '' : 's'}` : undefined,
                unavailableModelCount ? `${unavailableModelCount} unavailable model${unavailableModelCount === 1 ? '' : 's'}` : undefined,
                capabilityLabels.length ? `Provider: ${capabilityLabels.join(', ')}` : undefined
            ].filter(Boolean).join(' | ');
            refreshModelPickerButton();
            refreshVisualProviders();
            refreshVisualModels();
            refreshSubmitState();
        };

        const refreshVisualProviders = (): void => {
            const previous = visualProviderSelect.value;
            while (visualProviderSelect.firstChild) {
                visualProviderSelect.firstChild.remove();
            }
            const availableProviders = providers.filter(provider => provider.available && !providerNeedsConfiguration(provider));
            for (const provider of availableProviders) {
                appendSelectOption(visualProviderSelect, provider.id, provider.label);
            }
            visualProviderSelect.value = availableProviders.some(provider => provider.id === previous)
                ? previous
                : saved.visualProviderId && availableProviders.some(provider => provider.id === saved.visualProviderId)
                    ? saved.visualProviderId
                    : selectedProvider()?.available && !providerNeedsConfiguration(selectedProvider())
                        ? selectedProvider()?.id ?? ''
                        : availableProviders[0]?.id ?? '';
            visualProviderSelect.disabled = !visualJudgeToggle.checked || !availableProviders.length;
            visualJudgeToggle.disabled = !availableProviders.length;
        };

        const refreshVisualModels = (): void => {
            const provider = selectedVisualProvider();
            const previous = visualModelSelect.value;
            while (visualModelSelect.firstChild) {
                visualModelSelect.firstChild.remove();
            }
            const availableModels = uniqueNonEmpty([
                provider?.defaultModel,
                ...(provider?.models ?? [])
            ]).filter(model => {
                const metadata = provider?.modelMetadata?.find(candidate => candidate.id === model);
                return !isOpenPencilAiModelUnavailable(metadata);
            });
            const recommendedModels = availableModels.filter(model => {
                const metadata = provider?.modelMetadata?.find(candidate => candidate.id === model);
                return !metadata || modelSupportsVisionInput(metadata);
            });
            const candidateModels = visualShowAllInput.checked ? availableModels : recommendedModels;
            for (const model of candidateModels) {
                const metadata = provider?.modelMetadata?.find(candidate => candidate.id === model);
                appendSelectOption(visualModelSelect, model, formatOpenPencilAiModelLabel(model, metadata));
            }
            visualModelSelect.value = candidateModels.includes(previous)
                ? previous
                : saved.visualModel && candidateModels.includes(saved.visualModel)
                    ? saved.visualModel
                    : candidateModels[0] ?? '';
            visualModelSelect.disabled = !visualJudgeToggle.checked || !candidateModels.length;
            visualJudgeToggle.title = candidateModels.length
                ? ''
                : visualShowAllInput.checked
                    ? 'No model is available for the selected provider.'
                    : 'No model is marked as vision-capable or unknown. Enable All models to force a text-only model at your own risk.';
            visualShowAllLabel.title = visualShowAllInput.checked
                ? 'Showing every available model, including models declared text-only.'
                : 'Showing models with vision support plus models whose capabilities are unknown.';
            renderVisualModelPickerMenu();
        };

        const renderRuntimePicker = (): void => {
            if (!options.runtimeService) {
                return;
            }
            if (!runtimeRoot) {
                runtimeRoot = createRoot(runtimePickerHost);
            }
            runtimeRoot.render(React.createElement(CyberVinciAiExecutionPicker, {
                service: options.runtimeService,
                workspacePath: options.workspacePath,
                value: runtimeExecution,
                onConfigureProvider: async provider => {
                    if (!options.configureProvider) {
                        return;
                    }
                    const state = await options.configureProvider(provider);
                    if (state) {
                        providers = state.providers;
                        defaultExecution = state.defaultExecution;
                        loadingProviders = false;
                        refreshProviders();
                    }
                },
                onSelectedProviderChange: provider => {
                    runtimeSelectedProvider = provider;
                    rememberRuntimeProvider(provider);
                    loadingProviders = false;
                    refreshVisualProviders();
                    refreshVisualModels();
                    refreshDetails();
                    reposition();
                },
                onChange: selection => {
                    runtimeExecution = selection;
                    runtimeSelectedProvider = providers.find(provider => provider.id === selection.providerId) ?? runtimeSelectedProvider;
                    rememberRuntimeProvider(runtimeSelectedProvider);
                    loadingProviders = false;
                    refreshVisualProviders();
                    refreshVisualModels();
                    refreshDetails();
                    reposition();
                    renderRuntimePicker();
                }
            }));
        };

        const configureSelectedProvider = async (): Promise<void> => {
            const provider = selectedProvider();
            if (!provider || !options.configureProvider) {
                return;
            }
            configureButton.disabled = true;
            error.textContent = '';
            details.textContent = `Configuring ${provider.label}...`;
            try {
                const state = await options.configureProvider(provider);
                if (state) {
                    providers = state.providers;
                    defaultExecution = state.defaultExecution;
                    loadingProviders = false;
                    refreshProviders();
                } else {
                    refreshDetails();
                }
            } catch (reason) {
                error.textContent = String((reason as Error)?.message ?? reason);
                refreshDetails();
            } finally {
                configureButton.disabled = false;
                reposition();
            }
        };

        const refreshModels = (): void => {
            const provider = selectedProvider();
            const previous = modelSelect.value;
            while (modelSelect.firstChild) {
                modelSelect.firstChild.remove();
            }
            const preferred = provider?.id === saved.providerId
                ? saved.model
                : provider?.id === defaultExecution?.providerId
                    ? defaultExecution?.model
                    : undefined;
            const models = uniqueNonEmpty([
                provider?.defaultModel,
                ...(provider?.models ?? [])
            ]);
            if (!models.length) {
                appendSelectOption(modelSelect, '', 'Provider default');
                modelSelect.disabled = true;
                renderModelPickerMenu();
                refreshVisualModels();
                return;
            }
            const metadataById = new Map((provider?.modelMetadata ?? []).map(model => [model.id, model]));
            modelSelect.disabled = false;
            for (const model of models) {
                const metadata = metadataById.get(model);
                const option = appendSelectOption(modelSelect, model, formatOpenPencilAiModelLabel(model, metadata));
                option.disabled = isOpenPencilAiModelUnavailable(metadata);
            }
            const selectableModels = models.filter(model => !isOpenPencilAiModelUnavailable(metadataById.get(model)));
            modelSelect.value = selectableModels.includes(previous)
                ? previous
                : preferred && selectableModels.includes(preferred)
                    ? preferred
                    : provider?.defaultModel && selectableModels.includes(provider.defaultModel)
                        ? provider.defaultModel
                        : selectableModels[0] ?? (models.includes(previous) ? previous : models[0]);
            renderModelPickerMenu();
            refreshVisualModels();
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(undefined);
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                panel.requestSubmit();
            }
        };

        const reposition = (): void => {
            positionOpenPencilAiPromptPopover(panel, options.anchorRect);
            if (!modelMenu.hidden) {
                positionOpenPencilAiModelMenu(modelButton, modelMenu);
            }
            if (!visualModelMenu.hidden) {
                positionOpenPencilAiModelMenu(visualModelButton, visualModelMenu);
            }
        };

        const refreshProviders = (): void => {
            const previous = providerSelect.value;
            while (providerSelect.firstChild) {
                providerSelect.firstChild.remove();
            }
            if (providers.length) {
                providerSelect.disabled = false;
                for (const provider of providers) {
                    appendSelectOption(providerSelect, provider.id, `${provider.label}${provider.available ? '' : ' (unavailable)'}`);
                }
                providerSelect.value = providers.some(provider => provider.id === previous)
                    ? previous
                    : resolveInitialProviderId(providers, defaultExecution, saved) ?? providers[0].id;
            } else {
                appendSelectOption(providerSelect, '', loadingProviders ? 'Loading providers...' : 'Default provider');
                providerSelect.disabled = true;
            }
            refreshModels();
            refreshDetails();
        };

        providerSelect.addEventListener('change', () => {
            refreshModels();
            refreshDetails();
            refreshVisualProviders();
            refreshVisualModels();
            reposition();
            const provider = selectedProvider();
            if (providerNeedsConfiguration(provider)) {
                void configureSelectedProvider();
            }
        });
        modelSelect.addEventListener('change', () => {
            renderModelPickerMenu();
            refreshDetails();
            reposition();
        });
        modelButton.addEventListener('click', event => {
            event.preventDefault();
            toggleModelMenu();
            reposition();
        });
        visualModelButton.addEventListener('click', event => {
            event.preventDefault();
            toggleVisualModelMenu();
            reposition();
        });
        configureButton.addEventListener('click', () => {
            void configureSelectedProvider();
        });
        cancelButton.addEventListener('click', () => close(undefined));
        promptInput.addEventListener('input', refreshSubmitState);
        visualReferenceInput.addEventListener('input', refreshVisualReferenceVisibility);
        visualJudgeToggle.addEventListener('change', () => {
            refreshVisualProviders();
            refreshVisualModels();
            refreshVisualReferenceVisibility();
            reposition();
        });
        visualProviderSelect.addEventListener('change', () => {
            refreshVisualModels();
            refreshVisualReferenceVisibility();
            reposition();
        });
        visualModelSelect.addEventListener('change', () => {
            refreshVisualReferenceVisibility();
            renderVisualModelPickerMenu();
            reposition();
        });
        visualShowAllInput.addEventListener('change', () => {
            refreshVisualModels();
            refreshVisualReferenceVisibility();
            reposition();
        });
        panel.addEventListener('mousedown', event => {
            if (!modelPicker.contains(event.target as Node)) {
                closeModelMenu();
            }
            if (!visualModelPicker.contains(event.target as Node)) {
                closeVisualModelMenu();
            }
        });
        layer.addEventListener('mousedown', event => {
            if (event.target === layer) {
                close(undefined);
            }
        });
        panel.addEventListener('submit', event => {
            event.preventDefault();
            const prompt = promptInput.value.trim();
            if (!prompt) {
                error.textContent = 'Enter a prompt before running Canvas AI.';
                promptInput.focus();
                return;
            }
            if (!selectedProviderCanRun()) {
                error.textContent = selectedProvider()
                    ? 'Configure this provider before running Canvas AI.'
                    : 'Choose an available provider before running Canvas AI.';
                return;
            }
            const result: OpenPencilAiPromptDialogResult = {
                prompt,
                providerId: options.runtimeService ? runtimeExecution.providerId : selectedProvider()?.id,
                provider: selectedProvider(),
                model: options.runtimeService ? runtimeExecution.model : modelSelect.value.trim() || undefined,
                reasoningEffort: (options.runtimeService
                    ? runtimeExecution.reasoningEffort ?? 'medium'
                    : reasoningSelect.value) as NonNullable<CyberVinciAiExecutionSelection['reasoningEffort']>,
                imagePolicy: {
                    mode: imageSelect.value as OpenPencilAiImageMode,
                    maxAssets: imageSelect.value === 'off' ? 0 : 12,
                    cacheImagesLocally: true
                },
                visualReference: {
                    mode: visualReferenceInput.value.trim() || isOpenPencilAiVisualReferencePrompt(prompt) ? 'auto' : 'off',
                    referenceUrl: visualReferenceInput.value.trim() || undefined,
                    visualModelEnabled: visualJudgeToggle.checked,
                    visualProviderId: visualJudgeToggle.checked ? visualProviderSelect.value.trim() || undefined : undefined,
                    visualProvider: visualJudgeToggle.checked ? selectedVisualProvider() : undefined,
                    visualModel: visualJudgeToggle.checked ? visualModelSelect.value.trim() || undefined : undefined,
                    visualShowAllModels: visualShowAllInput.checked,
                    targetScore: 0.82,
                    maxPasses: 2
                },
                defaultExecution: options.runtimeService ? runtimeExecution : defaultExecution
            };
            saveOpenPencilAiPromptDefaults(result);
            close(result);
        });

        refreshProviders();
        layer.appendChild(panel);
        document.body.appendChild(layer);
        renderRuntimePicker();
        reposition();
        document.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('resize', reposition, true);
        window.addEventListener('scroll', reposition, true);
        globalThis.setTimeout(() => promptInput.focus(), 0);
        options.providerState?.then(state => {
            providers = state.providers;
            defaultExecution = state.defaultExecution;
            loadingProviders = false;
            if (options.runtimeService && !runtimeExecution.providerId) {
                runtimeExecution = createOpenPencilRuntimeExecution(defaultExecution, saved);
                renderRuntimePicker();
            }
            if (!saved.reasoningEffort && defaultExecution?.reasoningEffort) {
                reasoningSelect.value = defaultExecution.reasoningEffort;
            }
            if (layer.isConnected) {
                refreshProviders();
                reposition();
            }
        }, () => {
            providers = [];
            defaultExecution = undefined;
            loadingProviders = false;
            if (options.runtimeService && !runtimeExecution.providerId) {
                runtimeExecution = createOpenPencilRuntimeExecution(defaultExecution, saved);
                renderRuntimePicker();
            }
            if (layer.isConnected) {
                refreshProviders();
                reposition();
            }
        });
    });
}

function createOpenPencilRuntimeExecution(
    defaultExecution: CyberVinciAiExecutionSelection | undefined,
    saved: SavedOpenPencilAiPromptDefaults
): CyberVinciAiExecutionSelection {
    return {
        ...defaultExecution,
        providerId: saved.providerId ?? defaultExecution?.providerId,
        model: saved.model ?? defaultExecution?.model,
        reasoningPolicy: defaultExecution?.reasoningPolicy ?? 'auto',
        reasoningEffort: saved.reasoningEffort ?? defaultExecution?.reasoningEffort ?? 'medium'
    };
}

function createOpenPencilAiSparklesIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('openpencil-ai-sparkles-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const pathData of [
        'M12 2l1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2z',
        'M19 14l.8 2.6 2.7.9-2.7.9L19 21l-.8-2.6-2.7-.9 2.7-.9L19 14z',
        'M5 13l.7 2.1 2.3.8-2.3.8L5 19l-.7-2.3-2.3-.8 2.3-.8L5 13z'
    ]) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
    }
    return svg;
}

function positionOpenPencilAiPromptPopover(panel: HTMLElement, anchorRect?: OpenPencilAiPromptDialogAnchorRect): void {
    const margin = 8;
    const maxWidth = Math.max(280, window.innerWidth - margin * 2);
    const width = Math.min(720, maxWidth);
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${Math.max(220, window.innerHeight - margin * 2)}px`;

    const panelRect = panel.getBoundingClientRect();
    const fallbackLeft = window.innerWidth - panelRect.width - 64;
    const anchorLeftFits = anchorRect ? anchorRect.left + panelRect.width <= window.innerWidth - margin : false;
    const preferredLeft = anchorRect
        ? anchorLeftFits ? anchorRect.left : anchorRect.right - panelRect.width
        : fallbackLeft;
    const fallbackTop = 48;
    const belowTop = anchorRect ? anchorRect.bottom + margin : fallbackTop;
    const aboveTop = anchorRect ? anchorRect.top - panelRect.height - margin : fallbackTop;
    const canFitBelow = belowTop + panelRect.height <= window.innerHeight - margin;
    const preferredTop = canFitBelow || aboveTop < margin ? belowTop : aboveTop;
    const maxLeft = Math.max(margin, window.innerWidth - panelRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - panelRect.height - margin);
    const left = clamp(preferredLeft, margin, maxLeft);
    const top = clamp(preferredTop, margin, maxTop);

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
}

function positionOpenPencilAiModelMenu(button: HTMLElement, menu: HTMLElement): void {
    const margin = 8;
    const rect = button.getBoundingClientRect();
    const maxWidth = Math.max(260, window.innerWidth - margin * 2);
    const width = Math.min(Math.max(rect.width, 560), maxWidth);
    const left = clamp(rect.left, margin, Math.max(margin, window.innerWidth - width - margin));
    const belowTop = rect.bottom + 4;
    const maxBelowHeight = window.innerHeight - belowTop - margin;
    const maxAboveHeight = rect.top - margin * 2;
    const preferBelow = maxBelowHeight >= 220 || maxBelowHeight >= maxAboveHeight;
    const maxHeight = Math.max(180, Math.min(480, preferBelow ? maxBelowHeight : maxAboveHeight));
    const top = preferBelow
        ? belowTop
        : Math.max(margin, rect.top - maxHeight - 4);

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.width = `${Math.round(width)}px`;
    menu.style.maxHeight = `${Math.round(maxHeight)}px`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function createDialogField(labelText: string, control: HTMLElement, extraClassName?: string): HTMLElement {
    const label = document.createElement('label');
    label.className = ['openpencil-ai-prompt-dialog-field', extraClassName].filter(Boolean).join(' ');
    const text = document.createElement('span');
    text.textContent = labelText;
    label.appendChild(text);
    label.appendChild(control);
    return label;
}

function createSelectShell(select: HTMLSelectElement): HTMLElement {
    const shell = document.createElement('span');
    shell.className = 'openpencil-ai-select-shell';
    shell.append(select, createControlCaret());
    return shell;
}

function createControlCaret(extraClassName?: string): HTMLElement {
    const caret = document.createElement('span');
    caret.className = ['cybervinci-control-caret', 'openpencil-control-caret', 'openpencil-ai-control-caret', extraClassName].filter(Boolean).join(' ');
    caret.setAttribute('aria-hidden', 'true');
    return caret;
}

function appendSelectOption(select: HTMLSelectElement, value: string, label: string): HTMLOptionElement {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
    return option;
}

function formatOpenPencilAiModelLabel(model: string, _metadata: CyberVinciAiModelMetadata | undefined): string {
    if (_metadata?.unavailable) {
        return `${model} - Unavailable`;
    }
    return model;
}

function formatOpenPencilAiModelBadges(metadata: CyberVinciAiModelMetadata | undefined): string[] {
    return [
        metadata?.unavailable ? 'Unavailable' : undefined,
        metadata?.cost ? formatOpenPencilAiModelCost(metadata.cost) : undefined,
        ...formatOpenPencilAiModelCapabilityBadges(metadata)
    ].filter((label): label is string => !!label);
}

function formatOpenPencilAiModelCapabilityBadges(metadata: CyberVinciAiModelMetadata | undefined): string[] {
    if (!metadata) {
        return [];
    }
    return [
        modelSupportsVisionInput(metadata) ? 'Vision' : undefined,
        modelSupportsImageOutput(metadata) ? 'Image Gen' : undefined,
        modelSupportsInputModality(metadata, 'pdf') ? 'PDF' : undefined,
        modelSupportsInputModality(metadata, 'audio') ? 'Audio' : undefined,
        modelSupportsInputModality(metadata, 'video') ? 'Video' : undefined,
        metadata.reasoning ? 'Reasoning' : undefined,
        metadata.toolCalling ? 'Tools' : undefined,
        metadata.structuredOutput ? 'Structured' : undefined
    ].filter((label): label is string => !!label);
}

function formatOpenPencilAiModelCost(cost: NonNullable<CyberVinciAiModelMetadata['cost']>): string {
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

function appendModelCapabilityIcon(parent: HTMLElement, label: string, tone: string): void {
    const icon = document.createElement('span');
    icon.className = `openpencil-ai-model-capability-icon openpencil-ai-model-capability-icon-${tone} cybervinci-product-icon cybervinci-product-icon-${modelCapabilityIcon(label)}`;
    icon.title = label;
    icon.setAttribute('aria-label', label);
    parent.appendChild(icon);
}

function modelCapabilityIcon(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('free') || normalized === 'included') {
        return 'dollar-sign';
    }
    if (normalized.includes('unavailable')) {
        return 'ban';
    }
    if (normalized.includes('paid')) {
        return 'dollar-sign';
    }
    if (normalized.includes('vision')) {
        return 'eye';
    }
    if (normalized.includes('image')) {
        return 'file-image';
    }
    if (normalized.includes('pdf')) {
        return 'file-type-2';
    }
    if (normalized.includes('audio')) {
        return 'volume-2';
    }
    if (normalized.includes('video')) {
        return 'video';
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

function modelBadgeTone(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('free') || normalized === 'included') {
        return 'free';
    }
    if (normalized.includes('paid')) {
        return 'paid';
    }
    if (normalized.includes('unavailable')) {
        return 'unavailable';
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

function modelSupportsVisionInput(metadata: CyberVinciAiModelMetadata | undefined): boolean {
    return modelSupportsInputModality(metadata, 'image');
}

function isOpenPencilAiModelUnavailable(metadata: CyberVinciAiModelMetadata | undefined): boolean {
    return !!metadata?.unavailable;
}

function modelSupportsImageOutput(metadata: CyberVinciAiModelMetadata | undefined): boolean {
    return modelSupportsOutputModality(metadata, 'image');
}

function modelSupportsInputModality(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return modelSupportsModality(metadata?.inputModalities, modality);
}

function modelSupportsOutputModality(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return modelSupportsModality(metadata?.outputModalities, modality);
}

function modelSupportsModality(modalities: readonly string[] | undefined, modality: string): boolean {
    const expected = modality.toLowerCase();
    return modalities?.some(value => value.toLowerCase() === expected) ?? false;
}

function resolveInitialProviderId(
    providers: CyberVinciAiProviderDescriptor[],
    defaultExecution: CyberVinciAiExecutionSelection | undefined,
    saved: SavedOpenPencilAiPromptDefaults
): string | undefined {
    const savedProvider = saved.providerId ? providers.find(provider => provider.id === saved.providerId) : undefined;
    if (savedProvider) {
        return savedProvider.id;
    }
    const defaultProvider = defaultExecution?.providerId ? providers.find(provider => provider.id === defaultExecution.providerId) : undefined;
    if (defaultProvider) {
        return defaultProvider.id;
    }
    return providers.find(provider => provider.available)?.id ?? providers[0]?.id;
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const trimmed = value?.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        result.push(trimmed);
    }
    return result;
}

function readSavedOpenPencilAiPromptDefaults(): SavedOpenPencilAiPromptDefaults {
    try {
        const raw = window.localStorage.getItem(OPENPENCIL_AI_PROMPT_DIALOG_STORAGE_KEY);
        return raw ? JSON.parse(raw) as SavedOpenPencilAiPromptDefaults : {};
    } catch {
        return {};
    }
}

function saveOpenPencilAiPromptDefaults(result: OpenPencilAiPromptDialogResult): void {
    try {
        window.localStorage.setItem(OPENPENCIL_AI_PROMPT_DIALOG_STORAGE_KEY, JSON.stringify({
            providerId: result.providerId,
            model: result.model,
            reasoningEffort: result.reasoningEffort,
            imageMode: result.imagePolicy.mode,
            visualModelEnabled: result.visualReference.visualModelEnabled,
            visualProviderId: result.visualReference.visualProviderId,
            visualModel: result.visualReference.visualModel,
            visualShowAllModels: result.visualReference.visualShowAllModels
        } satisfies SavedOpenPencilAiPromptDefaults));
    } catch {
        // Local storage may be unavailable in restricted browser contexts.
    }
}

function isOpenPencilAiVisualReferencePrompt(prompt: string): boolean {
    return /\b(clone|clonar|copy|copia|cópia|copie|copiar|igual|parecido|similar|refer[eê]ncia|reference|print|screenshot|captura|recrie|recreate|mimic|imite|amazon|mercado\s+livre|netflix|spotify|youtube|github|figma)\b/i.test(prompt);
}

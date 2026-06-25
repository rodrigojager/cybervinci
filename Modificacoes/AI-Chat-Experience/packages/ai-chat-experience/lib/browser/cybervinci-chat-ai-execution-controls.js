"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciChatAiExecutionControls = exports.CyberVinciChatVirtualReasoningSelector = exports.CyberVinciChatWorkflowRoutingSelector = exports.CyberVinciChatModeSelector = void 0;
exports.readChatAiExecutionFromPreferences = readChatAiExecutionFromPreferences;
exports.normalizeCyberVinciFlowChatMode = normalizeCyberVinciFlowChatMode;
exports.normalizeCyberVinciChatMode = normalizeCyberVinciChatMode;
exports.cyberVinciChatModeToRequestModeId = cyberVinciChatModeToRequestModeId;
exports.normalizeVirtualReasoningMode = normalizeVirtualReasoningMode;
exports.hoverHandler = hoverHandler;
exports.positionCyberVinciChatMenu = positionCyberVinciChatMenu;
const ai_providers_preferences_1 = require("@cybervinci/ai-providers/lib/common/ai-providers-preferences");
const core_1 = require("@theia/core");
const preferences_1 = require("@theia/core/lib/common/preferences");
const React = require("@theia/core/shared/react");
const ReactDOM = require("@theia/core/shared/react-dom");
const cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
const AI_PROVIDERS_CONFIGURE_COMMAND = 'chat:ai-providers-configure';
const CODEX_MODEL_PRESETS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex-spark'];
const OPENCODE_GO_MODEL_PRESETS = [
    'opencode-go/minimax-m3',
    'opencode-go/minimax-m2.7',
    'opencode-go/minimax-m2.5',
    'opencode-go/kimi-k2.7-code',
    'opencode-go/kimi-k2.6',
    'opencode-go/kimi-k2.5',
    'opencode-go/glm-5.1',
    'opencode-go/glm-5',
    'opencode-go/deepseek-v4-pro',
    'opencode-go/deepseek-v4-flash',
    'opencode-go/qwen3.7-max',
    'opencode-go/qwen3.7-plus',
    'opencode-go/qwen3.6-plus',
    'opencode-go/qwen3.5-plus',
    'opencode-go/mimo-v2-pro',
    'opencode-go/mimo-v2-omni',
    'opencode-go/mimo-v2.5-pro',
    'opencode-go/mimo-v2.5',
    'opencode-go/hy3-preview'
];
const OPENCODE_ZEN_MODEL_PRESETS = [
    'opencode/claude-fable-5',
    'opencode/claude-opus-4-8',
    'opencode/claude-opus-4-7',
    'opencode/claude-opus-4-6',
    'opencode/claude-opus-4-5',
    'opencode/claude-opus-4-1',
    'opencode/claude-sonnet-4-6',
    'opencode/claude-sonnet-4-5',
    'opencode/claude-sonnet-4',
    'opencode/claude-haiku-4-5',
    'opencode/gemini-3.5-flash',
    'opencode/gemini-3.1-pro',
    'opencode/gemini-3-flash',
    'opencode/gpt-5.5',
    'opencode/gpt-5.5-pro',
    'opencode/gpt-5.4',
    'opencode/gpt-5.4-pro',
    'opencode/gpt-5.4-mini',
    'opencode/gpt-5.4-nano',
    'opencode/gpt-5.3-codex-spark',
    'opencode/gpt-5.3-codex',
    'opencode/gpt-5.2',
    'opencode/gpt-5.2-codex',
    'opencode/gpt-5.1',
    'opencode/gpt-5.1-codex-max',
    'opencode/gpt-5.1-codex',
    'opencode/gpt-5.1-codex-mini',
    'opencode/gpt-5',
    'opencode/gpt-5-codex',
    'opencode/gpt-5-nano',
    'opencode/grok-build-0.1',
    'opencode/deepseek-v4-pro',
    'opencode/deepseek-v4-flash',
    'opencode/glm-5.1',
    'opencode/glm-5',
    'opencode/minimax-m2.7',
    'opencode/minimax-m2.5',
    'opencode/kimi-k2.6',
    'opencode/kimi-k2.5',
    'opencode/qwen3.6-plus',
    'opencode/qwen3.5-plus',
    'opencode/big-pickle',
    'opencode/deepseek-v4-flash-free',
    'opencode/mimo-v2.5-free',
    'opencode/qwen3.6-plus-free',
    'opencode/minimax-m3-free',
    'opencode/nemotron-3-ultra-free',
    'opencode/north-mini-code-free'
];
const CHAT_AI_PROVIDER_PRESETS = [
    {
        id: 'codex-app-server:codex',
        runtime: 'codex-app-server',
        modelProvider: 'codex',
        label: 'Codex CLI',
        available: true,
        defaultModel: 'gpt-5.5',
        models: CODEX_MODEL_PRESETS,
        modelMetadata: CODEX_MODEL_PRESETS.map(model => ({
            id: model,
            cost: 'included',
            reasoning: true,
            toolCalling: true,
            structuredOutput: true
        })),
        capabilities: { webSearch: true },
        supportsNativeReasoning: true,
        supportsVirtualReasoning: true
    },
    {
        id: 'direct-http:openrouter',
        runtime: 'direct-http',
        modelProvider: 'openrouter',
        label: 'OpenRouter',
        available: true,
        defaultModel: 'openrouter/openai/gpt-5.5',
        models: ['openrouter/openai/gpt-5.5', 'openrouter/anthropic/claude-sonnet-4.5', 'openrouter/google/gemini-2.5-pro'],
        configurationRequired: ['OpenRouter API key']
    },
    {
        id: 'direct-http:opencode-go',
        runtime: 'direct-http',
        modelProvider: 'opencode-go',
        label: 'OpenCode Go',
        available: true,
        defaultModel: 'opencode-go/deepseek-v4-flash',
        models: OPENCODE_GO_MODEL_PRESETS,
        modelMetadata: OPENCODE_GO_MODEL_PRESETS.map(model => chatAiDirectModelMetadata(model, 'included')),
        configurationRequired: ['OpenCode API key']
    },
    {
        id: 'direct-http:opencode',
        runtime: 'direct-http',
        modelProvider: 'opencode',
        label: 'OpenCode Zen',
        available: true,
        defaultModel: 'opencode/gpt-5.5',
        models: OPENCODE_ZEN_MODEL_PRESETS,
        modelMetadata: OPENCODE_ZEN_MODEL_PRESETS.map(model => chatAiDirectModelMetadata(model, chatAiOpenCodeZenModelCost(model))),
        configurationRequired: ['OpenCode API key']
    },
    {
        id: 'gemini-cli:gemini',
        runtime: 'gemini-cli',
        modelProvider: 'gemini',
        label: 'Gemini CLI',
        available: true,
        models: ['gemini-2.5-pro', 'gemini-2.5-flash']
    },
    {
        id: 'claude-code-cli:claude-code',
        runtime: 'claude-code-cli',
        modelProvider: 'claude-code',
        label: 'Claude Code',
        available: true,
        defaultModel: 'sonnet',
        models: ['sonnet', 'opus', 'haiku']
    },
    {
        id: 'cursor-cli:cursor',
        runtime: 'cursor-cli',
        modelProvider: 'cursor',
        label: 'Cursor CLI',
        available: true,
        models: ['auto']
    }
];
const CHAT_AI_REASONING_VARIANT_DEFAULT = {
    id: 'default',
    label: 'Default',
    description: 'Use the provider and model default reasoning variant.'
};
const CHAT_AI_REASONING_VARIANT_LABELS = {
    default: 'Default',
    none: 'None',
    high: 'High',
    max: 'Max',
    thinking: 'Thinking'
};
const CHAT_AI_SERVICE_TIER_DEFAULT = 'default';
const CHAT_AI_SERVICE_TIER_LABELS = {
    default: 'Default',
    fast: 'Fast',
    flex: 'Flex'
};
const CHAT_MODE_OPTIONS = [
    { value: 'chat', label: core_1.nls.localizeByDefault('Chat') },
    { value: 'edit', label: core_1.nls.localizeByDefault('Edit') },
    { value: 'plan', label: core_1.nls.localizeByDefault('Plan') },
    { value: 'readonly', label: core_1.nls.localize('theia/cybervinci/ai-chat/chatMode/readonly', 'Read Only') },
    { value: 'workspace', label: core_1.nls.localize('theia/cybervinci/ai-chat/chatMode/workspace', 'Workspace') },
    { value: 'fullaccess', label: core_1.nls.localize('theia/cybervinci/ai-chat/chatMode/fullAccess', 'Full Access') },
    { value: 'agent-next', label: core_1.nls.localize('theia/cybervinci/ai-chat/chatMode/agentNext', 'Agent Next') }
];
const CHAT_MODE_REQUEST_MODE_IDS = {
    chat: 'open-coder-system-agent-mode',
    edit: 'open-coder-system-edit',
    plan: 'ai-providers-plan',
    readonly: 'ai-providers-read-only',
    workspace: 'ai-providers-workspace-write',
    fullaccess: 'ai-providers-danger-full-access',
    'agent-next': 'open-coder-system-agent-mode-next'
};
const FLOW_MODE_OPTIONS = [
    { value: 'chat', label: core_1.nls.localize('theia/cybervinci/ai-chat/flowMode/direct', 'Direct') },
    { value: 'saved', label: core_1.nls.localize('theia/cybervinci/ai-chat/flowMode/saved', 'Saved Flow') },
    { value: 'dynamic', label: core_1.nls.localize('theia/cybervinci/ai-chat/flowMode/dynamic', 'Dynamic Workflow') }
];
const VIRTUAL_REASONING_MENU_OPTIONS = [
    { value: 'off', label: core_1.nls.localizeByDefault('Off') },
    { value: 'auto', label: core_1.nls.localizeByDefault('Auto') },
    { value: 'fast', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/fast', 'Fast') },
    { value: 'balanced', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/balanced', 'Balanced') },
    { value: 'deep', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/deep', 'Deep') },
    { value: 'coding', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/coding', 'Coding') },
    { value: 'research', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/research', 'Research') },
    { value: 'lats', label: core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/lats', 'LATS') }
];
const CyberVinciChatModeSelector = ({ preferenceService, disabled, hoverService }) => {
    const [currentMode, setCurrentMode] = React.useState(() => normalizeCyberVinciChatMode(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF, 'chat')));
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF) {
                setCurrentMode(normalizeCyberVinciChatMode(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF, 'chat')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);
    const title = core_1.nls.localize('theia/cybervinci/ai-chat/chatMode/title', 'Chat mode');
    return (React.createElement(CyberVinciCompactMenuButton, { menuKind: 'chatMode', className: `theia-ChatInput-ChatModeButton chat-mode-${currentMode}`, iconClass: 'codicon-comment-discussion', selectedLabel: CHAT_MODE_OPTIONS.find(option => option.value === currentMode)?.label ?? 'Chat', title: title, disabled: disabled, hoverService: hoverService, options: CHAT_MODE_OPTIONS, selectedValue: currentMode, onSelect: async (mode) => {
            const normalized = normalizeCyberVinciChatMode(mode);
            setCurrentMode(normalized);
            await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_MODE_PREF, normalized === 'chat' ? undefined : normalized, preferences_1.PreferenceScope.User);
        } }));
};
exports.CyberVinciChatModeSelector = CyberVinciChatModeSelector;
const CyberVinciChatWorkflowRoutingSelector = ({ preferenceService, currentMode, disabled, hoverService, onModeChange }) => {
    const effectiveMode = normalizeCyberVinciFlowChatMode(currentMode);
    const title = core_1.nls.localize('theia/cybervinci/ai-chat/flowMode/title', 'Flow routing');
    return (React.createElement(CyberVinciCompactMenuButton, { menuKind: 'workflow', className: `theia-ChatInput-FlowModeButton flow-mode-${effectiveMode}`, iconClass: 'codicon-git-branch', selectedLabel: FLOW_MODE_OPTIONS.find(option => option.value === effectiveMode)?.label ?? 'Direct', title: title, disabled: disabled, hoverService: hoverService, options: FLOW_MODE_OPTIONS, selectedValue: effectiveMode, onSelect: async (mode) => {
            const normalized = normalizeCyberVinciFlowChatMode(mode);
            await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, normalized === 'chat' ? undefined : normalized, preferences_1.PreferenceScope.User);
            onModeChange?.(normalized);
        } }));
};
exports.CyberVinciChatWorkflowRoutingSelector = CyberVinciChatWorkflowRoutingSelector;
const CyberVinciChatVirtualReasoningSelector = ({ preferenceService, disabled, hoverService }) => {
    const [currentMode, setCurrentMode] = React.useState(() => normalizeVirtualReasoningMode(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off')));
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF) {
                setCurrentMode(normalizeVirtualReasoningMode(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);
    const title = core_1.nls.localize('theia/cybervinci/ai-chat/virtualReasoning/title', 'Virtual Reasoning');
    return (React.createElement(CyberVinciCompactMenuButton, { menuKind: 'virtual', className: `theia-ChatInput-VirtualReasoningButton virtual-reasoning-${currentMode}${currentMode !== 'off' ? ' toggled' : ''}`, iconClass: 'codicon-lightbulb', selectedLabel: VIRTUAL_REASONING_MENU_OPTIONS.find(option => option.value === currentMode)?.label ?? 'Off', title: title, disabled: disabled, hoverService: hoverService, options: VIRTUAL_REASONING_MENU_OPTIONS, selectedValue: currentMode, onSelect: async (mode) => {
            const normalized = normalizeVirtualReasoningMode(mode);
            setCurrentMode(normalized);
            await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, normalized === 'off' ? undefined : normalized, preferences_1.PreferenceScope.User);
        } }));
};
exports.CyberVinciChatVirtualReasoningSelector = CyberVinciChatVirtualReasoningSelector;
const CyberVinciChatAiExecutionControls = ({ aiRuntimeService, preferenceService, commandService, flowMode, disabled, hoverService }) => {
    const [providers, setProviders] = React.useState(() => mergeChatAiProvidersWithFallbacks([]));
    const [selection, setSelection] = React.useState(() => readChatAiExecutionFromPreferences(preferenceService));
    const [openMenu, setOpenMenu] = React.useState();
    const [menuStyle, setMenuStyle] = React.useState();
    const [reloadVersion, setReloadVersion] = React.useState(0);
    const rootRef = React.useRef(null);
    const providerButtonRef = React.useRef(null);
    const modelButtonRef = React.useRef(null);
    const effortButtonRef = React.useRef(null);
    const variantButtonRef = React.useRef(null);
    const serviceTierButtonRef = React.useRef(null);
    const menuRef = React.useRef(null);
    React.useEffect(() => {
        let disposed = false;
        const fallback = mergeChatAiProvidersWithFallbacks([]);
        if (!aiRuntimeService) {
            setProviders(fallback);
            return () => {
                disposed = true;
            };
        }
        aiRuntimeService.listProviders({ includeUnavailable: true }).then(result => {
            if (!disposed) {
                setProviders(mergeChatAiProvidersWithFallbacks(result));
            }
        }).catch(() => {
            if (!disposed) {
                setProviders(fallback);
            }
        });
        return () => {
            disposed = true;
        };
    }, [aiRuntimeService, reloadVersion]);
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName.startsWith('ai-features.aiProviders.')) {
                setSelection(readChatAiExecutionFromPreferences(preferenceService));
                setReloadVersion(version => version + 1);
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);
    React.useEffect(() => {
        const preferred = resolveChatAiProvider(providers, readChatAiExecutionFromPreferences(preferenceService));
        if (preferred) {
            const nextSelection = normalizeChatAiSelectionForProvider(readChatAiExecutionFromPreferences(preferenceService), preferred);
            setSelection(current => chatAiSelectionsEqual(current, nextSelection) ? current : nextSelection);
        }
    }, [preferenceService, providers]);
    React.useEffect(() => {
        const close = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpenMenu(undefined);
        };
        const closeOnEscape = (event) => {
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
        const updateMenuStyle = () => {
            const button = openMenu === 'provider'
                ? providerButtonRef.current
                : openMenu === 'model'
                    ? modelButtonRef.current
                    : openMenu === 'effort'
                        ? effortButtonRef.current
                        : openMenu === 'variant'
                            ? variantButtonRef.current
                            : serviceTierButtonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(chatAiMenuWidth(openMenu), window.innerWidth - 24);
            setMenuStyle(positionCyberVinciChatMenu(rect, menuWidth, 420));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [openMenu]);
    if (flowMode === 'saved' || !providers.length) {
        return undefined;
    }
    const authoringMode = flowMode === 'dynamic';
    const selectedProvider = resolveChatAiProvider(providers, selection) ?? providers[0];
    const modelMetadata = new Map((selectedProvider.modelMetadata ?? []).map(model => [model.id, model]));
    const models = uniqueChatAiValues([selectedProvider.defaultModel, ...(selectedProvider.models ?? [])]);
    const selectedModel = resolveChatAiModel(selectedProvider, selection.model, modelMetadata);
    const selectedModelMetadata = selectedModel ? modelMetadata.get(selectedModel) : undefined;
    const providerNeedsConfiguration = !selectedProvider.available || !!selectedProvider.configurationRequired?.length;
    const effortOptions = resolveChatAiReasoningEfforts(selectedProvider, selectedModel, selectedModelMetadata);
    const selectedEffort = resolveSelectedChatAiReasoningEffort(selection, effortOptions);
    const reasoningVariants = resolveChatAiReasoningVariants(selectedProvider, selectedModel, selectedModelMetadata);
    const selectedVariant = resolveSelectedChatAiReasoningVariant(selection, reasoningVariants);
    const serviceTiers = resolveChatAiServiceTiers(selectedProvider, selectedModel, selectedModelMetadata);
    const selectedServiceTier = resolveSelectedChatAiServiceTier(selection, serviceTiers);
    const configureProvider = async (provider) => {
        await commandService.executeCommand(AI_PROVIDERS_CONFIGURE_COMMAND, {
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            mode: 'credentials'
        });
        setReloadVersion(version => version + 1);
    };
    const applySelection = async (nextSelection) => {
        setSelection(nextSelection);
        await persistChatAiExecution(preferenceService, nextSelection);
    };
    const updateProvider = async (provider) => {
        const nextSelection = normalizeChatAiSelectionForProvider({
            ...selection,
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            label: provider.label,
            executablePath: provider.executablePath
        }, provider);
        setOpenMenu(undefined);
        await applySelection(nextSelection);
        if (!provider.available || !!provider.configurationRequired?.length) {
            await configureProvider(provider);
        }
    };
    const updateModel = async (model) => {
        const metadata = modelMetadata.get(model);
        if (metadata?.unavailable) {
            await configureProvider(selectedProvider);
            return;
        }
        const variants = resolveChatAiReasoningVariants(selectedProvider, model, metadata);
        const variant = resolveSelectedChatAiReasoningVariant(selection, variants);
        const tiers = resolveChatAiServiceTiers(selectedProvider, model, metadata);
        const efforts = resolveChatAiReasoningEfforts(selectedProvider, model, metadata);
        const effort = resolveSelectedChatAiReasoningEffort(selection, efforts);
        const serviceTier = resolveSelectedChatAiServiceTier(selection, tiers);
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            model,
            reasoningEffort: toExecutionReasoningEffort(effort),
            reasoningVariant: variant.id,
            reasoningVariantOptions: variant.options,
            serviceTier: toExecutionServiceTier(serviceTier)
        });
    };
    const updateEffort = async (effort) => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            reasoningEffort: toExecutionReasoningEffort(effort)
        });
    };
    const updateVariant = async (variant) => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            reasoningVariant: variant.id,
            reasoningVariantOptions: variant.options
        });
    };
    const updateServiceTier = async (serviceTier) => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            serviceTier: toExecutionServiceTier(serviceTier)
        });
    };
    const toggleMenu = (menu) => {
        if (disabled) {
            return;
        }
        setOpenMenu(current => current === menu ? undefined : menu);
    };
    const providerTitle = providerNeedsConfiguration
        ? selectedProvider.configurationRequired?.length
            ? `Configure ${authoringMode ? 'authoring provider ' : ''}${selectedProvider.label}: ${selectedProvider.configurationRequired.join(', ')}`
            : selectedProvider.message ?? `Configure ${authoringMode ? 'authoring provider ' : ''}${selectedProvider.label}`
        : `${authoringMode ? 'Authoring provider' : 'Provider'}: ${selectedProvider.label}`;
    const modelTitle = selectedModelMetadata?.unavailable
        ? selectedModelMetadata.unavailableReason ?? 'Model unavailable; click to configure provider.'
        : selectedModel ? `${authoringMode ? 'Authoring model' : 'Model'}: ${selectedModel}` : `${authoringMode ? 'Authoring model' : 'Provider default model'}`;
    const reasoningEffortTitle = `${authoringMode ? 'Authoring reasoning effort' : 'Reasoning effort'}: ${chatAiReasoningEffortLabel(selectedEffort)}`;
    const reasoningVariantTitle = `${authoringMode ? 'Authoring reasoning variant' : 'Reasoning variant'}: ${chatAiReasoningVariantLabel(selectedVariant.id, selectedVariant.label)}`;
    const serviceTierTitle = `${authoringMode ? 'Authoring service tier' : 'Service tier'}: ${chatAiServiceTierLabel(selectedServiceTier)}`;
    const menu = openMenu === 'provider' ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu provider', "data-cybervinci-menu": 'provider', style: menuStyle, ref: menuRef }, providers.map(provider => {
        const needsConfiguration = !provider.available || !!provider.configurationRequired?.length;
        return (React.createElement("button", { key: provider.id, type: 'button', className: `theia-ChatInput-AiProviderMenuOption provider${provider.id === selectedProvider.id ? ' selected' : ''}${needsConfiguration ? ' unavailable' : ''}`, "data-cybervinci-option": provider.id, onClick: () => updateProvider(provider) },
            React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, provider.label),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionDetail' }, needsConfiguration
                ? provider.configurationRequired?.join(', ') ?? provider.message ?? 'Configuration required'
                : chatAiProviderRuntimeLabel(provider))));
    }))) : openMenu === 'model' ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu model', "data-cybervinci-menu": 'model', style: menuStyle, ref: menuRef }, models.map(model => {
        const metadata = modelMetadata.get(model);
        return (React.createElement("button", { key: model, type: 'button', className: `theia-ChatInput-AiProviderMenuOption${model === selectedModel ? ' selected' : ''}${metadata?.unavailable ? ' unavailable' : ''}`, "data-cybervinci-option": model, title: metadata?.unavailableReason, onClick: () => updateModel(model) },
            React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, model),
            React.createElement(ChatAiModelBadges, { metadata: metadata })));
    }))) : openMenu === 'effort' ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu compact', "data-cybervinci-menu": 'effort', style: menuStyle, ref: menuRef }, effortOptions.map(effort => (React.createElement("button", { key: effort, type: 'button', className: `theia-ChatInput-AiProviderMenuOption${effort === selectedEffort ? ' selected' : ''}`, "data-cybervinci-option": effort, onClick: () => updateEffort(effort) },
        React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, chatAiReasoningEffortLabel(effort)),
        effort !== 'default' ? React.createElement("span", { className: 'codicon codicon-lightbulb', title: 'Reasoning effort' }) : undefined))))) : openMenu === 'variant' ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu compact', "data-cybervinci-menu": 'variant', style: menuStyle, ref: menuRef }, reasoningVariants.map(variant => (React.createElement("button", { key: variant.id, type: 'button', className: `theia-ChatInput-AiProviderMenuOption${variant.id === selectedVariant.id ? ' selected' : ''}`, "data-cybervinci-option": variant.id, title: variant.description, onClick: () => updateVariant(variant) },
        React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, chatAiReasoningVariantLabel(variant.id, variant.label)),
        variant.id !== 'default' ? React.createElement("span", { className: 'theia-ChatInput-AiModelIcon capability cybervinci-product-icon cybervinci-product-icon-brain', title: 'Reasoning variant' }) : undefined))))) : openMenu === 'serviceTier' ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu compact', "data-cybervinci-menu": 'serviceTier', style: menuStyle, ref: menuRef }, serviceTiers.map(tier => (React.createElement("button", { key: tier, type: 'button', className: `theia-ChatInput-AiProviderMenuOption${tier === selectedServiceTier ? ' selected' : ''}`, "data-cybervinci-option": tier, onClick: () => updateServiceTier(tier) },
        React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, chatAiServiceTierLabel(tier)),
        tier !== 'default' ? React.createElement("span", { className: 'codicon codicon-zap', title: 'Service tier' }) : undefined))))) : undefined;
    return (React.createElement("span", { className: `theia-ChatInput-AiProviderSelector${authoringMode ? ' workflow-authoring' : ''}${disabled ? ' disabled' : ''}`, ref: rootRef },
        React.createElement("button", { ref: providerButtonRef, type: 'button', className: `theia-ChatInput-AiProviderButton${providerNeedsConfiguration ? ' needs-configuration' : ''}`, disabled: disabled, "data-cybervinci-control": 'provider', title: providerTitle, "aria-label": providerTitle, onClick: () => toggleMenu('provider'), onMouseEnter: hoverHandler(hoverService, providerTitle, 'top') },
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedProvider.label),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        React.createElement("button", { ref: modelButtonRef, type: 'button', className: `theia-ChatInput-AiProviderButton model${selectedModelMetadata?.unavailable ? ' needs-configuration' : ''}`, disabled: disabled || !models.length, "data-cybervinci-control": 'model', title: modelTitle, "aria-label": modelTitle, onClick: () => toggleMenu('model'), onMouseEnter: hoverHandler(hoverService, modelTitle, 'top') },
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedModel || 'Provider default'),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        React.createElement("button", { ref: effortButtonRef, type: 'button', className: 'theia-ChatInput-AiProviderButton compact', disabled: disabled || effortOptions.length <= 1, "data-cybervinci-control": 'effort', title: reasoningEffortTitle, "aria-label": reasoningEffortTitle, onClick: () => toggleMenu('effort') },
            React.createElement("span", { className: 'codicon codicon-lightbulb' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, chatAiReasoningEffortLabel(selectedEffort))),
        React.createElement("button", { ref: variantButtonRef, type: 'button', className: 'theia-ChatInput-AiProviderButton compact', disabled: disabled || reasoningVariants.length <= 1, "data-cybervinci-control": 'variant', title: reasoningVariantTitle, "aria-label": reasoningVariantTitle, onClick: () => toggleMenu('variant') },
            React.createElement("span", { className: 'theia-ChatInput-AiModelIcon capability cybervinci-product-icon cybervinci-product-icon-brain' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, chatAiReasoningVariantLabel(selectedVariant.id, selectedVariant.label))),
        React.createElement("button", { ref: serviceTierButtonRef, type: 'button', className: 'theia-ChatInput-AiProviderButton compact', disabled: disabled || serviceTiers.length <= 1, "data-cybervinci-control": 'serviceTier', title: serviceTierTitle, "aria-label": serviceTierTitle, onClick: () => toggleMenu('serviceTier') },
            React.createElement("span", { className: 'codicon codicon-zap' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, chatAiServiceTierLabel(selectedServiceTier))),
        menu ? ReactDOM.createPortal(menu, document.body) : undefined));
};
exports.CyberVinciChatAiExecutionControls = CyberVinciChatAiExecutionControls;
const CyberVinciCompactMenuButton = ({ menuKind, className, iconClass, selectedLabel, title, disabled, hoverService, options, selectedValue, onSelect }) => {
    const [open, setOpen] = React.useState(false);
    const [menuStyle, setMenuStyle] = React.useState();
    const rootRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const menuRef = React.useRef(null);
    React.useEffect(() => {
        const close = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
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
        if (!open) {
            setMenuStyle(undefined);
            return;
        }
        const updateMenuStyle = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(chatAiMenuWidth(menuKind), window.innerWidth - 24);
            setMenuStyle(positionCyberVinciChatMenu(rect, menuWidth, 420));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [open, menuKind]);
    const menu = open ? (React.createElement("div", { className: 'theia-ChatInput-AiProviderMenu compact', "data-cybervinci-menu": menuKind, style: menuStyle, ref: menuRef }, options.map(option => (React.createElement("button", { key: option.value, type: 'button', className: `theia-ChatInput-AiProviderMenuOption${option.value === selectedValue ? ' selected' : ''}`, "data-cybervinci-option": option.value, onClick: async () => {
            setOpen(false);
            await onSelect(option.value);
        } },
        React.createElement("span", { className: 'theia-ChatInput-AiProviderOptionName' }, option.label)))))) : undefined;
    return (React.createElement("span", { className: 'theia-ChatInput-CompactControl', ref: rootRef },
        React.createElement("button", { ref: buttonRef, type: 'button', className: `theia-ChatInput-AiProviderButton compact ${className}`, disabled: disabled, "data-cybervinci-control": menuKind, title: title, "aria-label": `${title}: ${selectedLabel}`, "aria-expanded": open, onClick: () => setOpen(current => !current), onMouseEnter: hoverHandler(hoverService, title) },
            React.createElement("span", { className: `codicon ${iconClass}` }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedLabel),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        menu ? ReactDOM.createPortal(menu, document.body) : undefined));
};
const ChatAiModelBadges = ({ metadata, labels, compact }) => {
    const badges = compact ? (labels ?? chatAiModelBadges(metadata)).slice(0, 2) : labels ?? chatAiModelBadges(metadata);
    if (!metadata && !labels) {
        return React.createElement("span", { className: 'theia-ChatInput-AiProviderBadges' },
            React.createElement(ChatAiCapabilityIcon, { label: 'Capabilities unknown' }));
    }
    if (!badges.length) {
        return React.createElement("span", { className: 'theia-ChatInput-AiProviderBadges' },
            React.createElement(ChatAiCapabilityIcon, { label: 'Text only' }));
    }
    return (React.createElement("span", { className: 'theia-ChatInput-AiProviderBadges' }, badges.map(label => React.createElement(ChatAiCapabilityIcon, { key: label, label: label }))));
};
const ChatAiCapabilityIcon = ({ label }) => (React.createElement("span", { className: `theia-ChatInput-AiModelIcon ${chatAiBadgeTone(label)} cybervinci-product-icon cybervinci-product-icon-${chatAiBadgeIcon(label)}`, title: label, "aria-label": label }));
function readChatAiExecutionFromPreferences(preferenceService) {
    const runtime = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
    const modelProvider = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
    const reasoningVariant = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_PREF, undefined);
    const reasoningVariantOptions = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, undefined);
    const reasoningEffort = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_REASONING_EFFORT_PREF, undefined);
    const serviceTier = preferenceService.get(ai_providers_preferences_1.CODEX_CLI_SERVICE_TIER_PREF, undefined);
    return {
        providerId: runtime && modelProvider ? `${runtime}:${modelProvider}` : undefined,
        runtime,
        modelProvider,
        model: preferenceService.get(ai_providers_preferences_1.CODEX_CLI_MODEL_PREF, undefined),
        reasoningEffort,
        reasoningVariant: reasoningVariant ?? 'default',
        reasoningVariantOptions,
        serviceTier,
        reasoningPolicy: 'auto'
    };
}
async function persistChatAiExecution(preferenceService, selection) {
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_RUNTIME_PREF, selection.runtime, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_MODEL_PROVIDER_PREF, selection.modelProvider, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_MODEL_PREF, selection.model?.trim() || undefined, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_REASONING_EFFORT_PREF, selection.reasoningEffort || undefined, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_PREF, selection.reasoningVariant === 'default' ? undefined : selection.reasoningVariant, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, selection.reasoningVariant && selection.reasoningVariant !== 'default' && selection.reasoningVariantOptions && Object.keys(selection.reasoningVariantOptions).length
        ? selection.reasoningVariantOptions
        : undefined, preferences_1.PreferenceScope.User);
    await preferenceService.set(ai_providers_preferences_1.CODEX_CLI_SERVICE_TIER_PREF, selection.serviceTier, preferences_1.PreferenceScope.User);
}
function chatAiSelectionsEqual(left, right) {
    return left.providerId === right.providerId &&
        left.runtime === right.runtime &&
        left.modelProvider === right.modelProvider &&
        left.model === right.model &&
        left.reasoningEffort === right.reasoningEffort &&
        left.reasoningVariant === right.reasoningVariant &&
        left.serviceTier === right.serviceTier &&
        JSON.stringify(left.reasoningVariantOptions ?? {}) === JSON.stringify(right.reasoningVariantOptions ?? {});
}
function resolveChatAiProvider(providers, selection) {
    return providers.find(provider => provider.id === selection.providerId)
        ?? providers.find(provider => provider.runtime === selection.runtime && provider.modelProvider === selection.modelProvider)
        ?? providers.find(provider => provider.available)
        ?? providers[0];
}
function normalizeChatAiSelectionForProvider(selection, provider) {
    const metadataById = new Map((provider.modelMetadata ?? []).map(model => [model.id, model]));
    const model = resolveChatAiModel(provider, selection.model, metadataById);
    const metadata = model ? metadataById.get(model) : undefined;
    const effort = resolveSelectedChatAiReasoningEffort(selection, resolveChatAiReasoningEfforts(provider, model, metadata));
    const variant = resolveSelectedChatAiReasoningVariant(selection, resolveChatAiReasoningVariants(provider, model, metadata));
    const serviceTier = resolveSelectedChatAiServiceTier(selection, resolveChatAiServiceTiers(provider, model, metadata));
    return {
        ...selection,
        providerId: provider.id,
        runtime: provider.runtime,
        modelProvider: provider.modelProvider,
        label: provider.label,
        executablePath: provider.executablePath,
        model,
        reasoningPolicy: selection.reasoningPolicy ?? 'auto',
        reasoningEffort: toExecutionReasoningEffort(effort),
        reasoningVariant: variant.id,
        reasoningVariantOptions: variant.options,
        serviceTier: toExecutionServiceTier(serviceTier)
    };
}
function resolveChatAiModel(provider, selectedModel, modelMetadata) {
    const models = uniqueChatAiValues([provider.defaultModel, ...(provider.models ?? [])]);
    const selected = selectedModel?.trim();
    const isSelectable = (model) => !modelMetadata.get(model)?.unavailable;
    if (!models.length) {
        return selected || provider.defaultModel;
    }
    if (selected && models.includes(selected) && isSelectable(selected)) {
        return selected;
    }
    const defaultModel = provider.defaultModel?.trim();
    if (defaultModel && models.includes(defaultModel) && isSelectable(defaultModel)) {
        return defaultModel;
    }
    return models.find(isSelectable) ?? (selected && models.includes(selected) ? selected : models[0]);
}
function resolveChatAiReasoningEfforts(provider, model, metadata) {
    if (!chatAiModelSupportsReasoning(metadata, model)) {
        return ['default'];
    }
    const normalizedModel = chatAiNormalizeModelFamily(model ?? metadata?.id ?? '');
    if (provider.modelProvider === 'opencode-go' && /\b(deepseek|glm|kimi|qwen|minimax|mimo|big pickle)\b/.test(normalizedModel)) {
        return ['default'];
    }
    return chatAiSupportsXHigh(normalizedModel)
        ? ['default', 'low', 'medium', 'high', 'xhigh']
        : ['default', 'low', 'medium', 'high'];
}
function resolveSelectedChatAiReasoningEffort(selection, efforts) {
    const selected = selection.reasoningEffort && selection.reasoningEffort !== 'none' ? selection.reasoningEffort : 'default';
    return efforts.includes(selected) ? selected : 'default';
}
function resolveChatAiReasoningVariants(provider, model, metadata) {
    const configured = metadata?.variants ? Object.entries(metadata.variants)
        .map(([id, variant]) => normalizeChatAiReasoningVariant(id, variant))
        .filter((variant) => !!variant && !variant.disabled) : [];
    if (configured.length) {
        return [CHAT_AI_REASONING_VARIANT_DEFAULT, ...configured.filter(variant => variant.id !== CHAT_AI_REASONING_VARIANT_DEFAULT.id)];
    }
    if (!chatAiModelSupportsReasoning(metadata, model)) {
        return [CHAT_AI_REASONING_VARIANT_DEFAULT];
    }
    const normalizedModel = chatAiNormalizeModelFamily(model ?? metadata?.id ?? '');
    if (normalizedModel.includes('claude') || provider.modelProvider.includes('anthropic')) {
        return [
            CHAT_AI_REASONING_VARIANT_DEFAULT,
            chatAiReasoningVariant('high', { thinking: { type: 'enabled', budgetTokens: 16000 } }, 'High thinking budget'),
            chatAiReasoningVariant('max', { thinking: { type: 'enabled', budgetTokens: 31999 } }, 'Maximum thinking budget')
        ];
    }
    if (normalizedModel.includes('gemini-3')) {
        return [
            CHAT_AI_REASONING_VARIANT_DEFAULT,
            chatAiReasoningVariant('high', { thinkingConfig: { includeThoughts: true, thinkingLevel: 'high' } })
        ];
    }
    if (normalizedModel.includes('gemini')) {
        return [
            CHAT_AI_REASONING_VARIANT_DEFAULT,
            chatAiReasoningVariant('high', { thinkingConfig: { includeThoughts: true, thinkingBudget: 16000 } }),
            chatAiReasoningVariant('max', { thinkingConfig: { includeThoughts: true, thinkingBudget: 24576 } })
        ];
    }
    if (provider.runtime === 'opencode-cli') {
        return [
            CHAT_AI_REASONING_VARIANT_DEFAULT,
            chatAiReasoningVariant('high', { reasoningEffort: 'high' }),
            chatAiReasoningVariant('max', { reasoningEffort: 'xhigh' })
        ];
    }
    return [CHAT_AI_REASONING_VARIANT_DEFAULT];
}
function normalizeChatAiReasoningVariant(id, value) {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const variant = value;
    const normalizedId = variant.id?.trim() || id.trim();
    if (!normalizedId) {
        return undefined;
    }
    return {
        id: normalizedId,
        label: typeof variant.label === 'string' ? variant.label : chatAiReasoningVariantLabel(normalizedId),
        description: typeof variant.description === 'string' ? variant.description : undefined,
        options: chatAiReadRecord(variant.options) ?? chatAiReadRecord(value),
        disabled: variant.disabled
    };
}
function chatAiReasoningVariant(id, options, description) {
    return {
        id,
        label: chatAiReasoningVariantLabel(id),
        description,
        options
    };
}
function resolveSelectedChatAiReasoningVariant(selection, variants) {
    const selectedId = selection.reasoningVariant?.trim();
    return (selectedId ? variants.find(variant => variant.id === selectedId) : undefined)
        ?? variants[0]
        ?? CHAT_AI_REASONING_VARIANT_DEFAULT;
}
function resolveChatAiServiceTiers(provider, model, metadata) {
    const normalizedModel = chatAiNormalizeModelFamily(model ?? metadata?.id ?? '');
    const openAiLike = /\b(gpt|o[1-9]|codex)\b/.test(normalizedModel)
        || provider.modelProvider === 'codex'
        || provider.runtime === 'codex-app-server';
    if (provider.runtime === 'codex-app-server' || (provider.runtime === 'direct-http' && openAiLike)) {
        return ['default', 'fast', 'flex'];
    }
    return ['default'];
}
function resolveSelectedChatAiServiceTier(selection, tiers) {
    const selected = selection.serviceTier ?? CHAT_AI_SERVICE_TIER_DEFAULT;
    return tiers.includes(selected) ? selected : CHAT_AI_SERVICE_TIER_DEFAULT;
}
function toExecutionReasoningEffort(effort) {
    return effort === 'default' ? undefined : effort;
}
function toExecutionServiceTier(tier) {
    return tier === 'default' ? undefined : tier;
}
function mergeChatAiProvidersWithFallbacks(runtimeProviders) {
    const byId = new Map();
    for (const provider of CHAT_AI_PROVIDER_PRESETS) {
        byId.set(provider.id, provider);
    }
    for (const provider of runtimeProviders) {
        const fallback = byId.get(provider.id);
        const models = uniqueChatAiValues([
            provider.defaultModel,
            ...(provider.models ?? []),
            fallback?.defaultModel,
            ...(fallback?.models ?? [])
        ]);
        const configurationRequired = provider.available
            ? provider.configurationRequired
            : provider.configurationRequired ?? fallback?.configurationRequired;
        byId.set(provider.id, {
            ...fallback,
            ...provider,
            defaultModel: provider.defaultModel ?? fallback?.defaultModel ?? models[0],
            models,
            modelMetadata: mergeChatAiModelMetadata(models, provider.modelMetadata, fallback?.modelMetadata),
            configurationRequired,
            supportsNativeReasoning: provider.supportsNativeReasoning ?? fallback?.supportsNativeReasoning ?? true,
            supportsVirtualReasoning: provider.supportsVirtualReasoning ?? fallback?.supportsVirtualReasoning ?? true
        });
    }
    return Array.from(byId.values());
}
function mergeChatAiModelMetadata(models, primary, fallback) {
    const byId = new Map();
    for (const metadata of fallback ?? []) {
        byId.set(metadata.id, metadata);
    }
    for (const metadata of primary ?? []) {
        byId.set(metadata.id, { ...byId.get(metadata.id), ...metadata });
    }
    for (const model of models) {
        if (!byId.has(model)) {
            byId.set(model, chatAiDirectModelMetadata(model, undefined));
        }
    }
    return byId.size ? Array.from(byId.values()) : undefined;
}
function chatAiDirectModelMetadata(id, cost) {
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
function chatAiOpenCodeZenModelCost(id) {
    const normalized = id.toLowerCase();
    return normalized.endsWith(':free') || normalized.includes('-free') || normalized.endsWith('/big-pickle')
        ? 'free-limited'
        : 'paid';
}
function uniqueChatAiValues(values) {
    return Array.from(new Set(values.map(value => value?.trim()).filter((value) => !!value)));
}
function chatAiModelBadges(metadata) {
    if (!metadata) {
        return [];
    }
    return [
        metadata.unavailable ? 'Unavailable' : undefined,
        metadata.cost ? chatAiModelCost(metadata.cost) : undefined,
        metadata.contextLength ? chatAiContextLabel(metadata.contextLength) : undefined,
        chatAiSupportsInput(metadata, 'image') ? 'Vision' : undefined,
        chatAiSupportsOutput(metadata, 'image') ? 'Image Gen' : undefined,
        chatAiSupportsInput(metadata, 'pdf') ? 'PDF' : undefined,
        chatAiSupportsInput(metadata, 'audio') ? 'Audio' : undefined,
        chatAiSupportsInput(metadata, 'video') ? 'Video' : undefined,
        metadata.attachment ? 'Attachments' : undefined,
        metadata.reasoning ? 'Reasoning' : undefined,
        metadata.toolCalling ? 'Tools' : undefined,
        metadata.structuredOutput ? 'Structured' : undefined,
        metadata.temperature ? 'Temperature' : undefined,
        metadata.pricing?.inputCacheRead || metadata.pricing?.cachedRead ? 'Cache read' : undefined,
        metadata.pricing?.inputCacheWrite || metadata.pricing?.cachedWrite ? 'Cache write' : undefined
    ].filter((label) => !!label);
}
function chatAiModelSupportsReasoning(metadata, model) {
    if (metadata?.reasoning) {
        return true;
    }
    const supported = metadata?.supportedParameters?.map(parameter => parameter.toLowerCase()) ?? [];
    if (supported.some(parameter => parameter.includes('reasoning') || parameter.includes('thinking'))) {
        return true;
    }
    const normalized = chatAiNormalizeModelFamily(model ?? metadata?.id ?? '');
    return /\b(gpt|o[1-9]|codex|claude|gemini|grok)\b/.test(normalized);
}
function chatAiNormalizeModelFamily(model) {
    const normalized = model.toLowerCase().replace(/^opencode-go\//, '').replace(/^opencode\//, '').replace(/^openrouter\//, '');
    return normalized.replace(/[:/._-]+/g, ' ');
}
function chatAiSupportsXHigh(normalizedModel) {
    return /\b(gpt 5|codex|o3|o4)\b/.test(normalizedModel);
}
function chatAiReadRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function chatAiContextLabel(contextLength) {
    if (contextLength >= 1000000) {
        return `${Math.round(contextLength / 1000000)}M context`;
    }
    if (contextLength >= 1000) {
        return `${Math.round(contextLength / 1000)}K context`;
    }
    return `${contextLength} context`;
}
function chatAiModelCost(cost) {
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
function chatAiProviderRuntimeLabel(provider) {
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
function chatAiSupportsInput(metadata, modality) {
    return chatAiSupportsModality(metadata?.inputModalities, modality);
}
function chatAiSupportsOutput(metadata, modality) {
    return chatAiSupportsModality(metadata?.outputModalities, modality);
}
function chatAiSupportsModality(modalities, modality) {
    const expected = modality.toLowerCase();
    return modalities?.some(value => value.toLowerCase() === expected) ?? false;
}
function chatAiReasoningEffortLabel(effort) {
    switch (effort) {
        case 'low': return core_1.nls.localizeByDefault('Low');
        case 'medium': return core_1.nls.localizeByDefault('Medium');
        case 'high': return core_1.nls.localizeByDefault('High');
        case 'xhigh': return core_1.nls.localize('theia/cybervinci/ai-chat/reasoning/xhigh', 'X High');
        default: return core_1.nls.localizeByDefault('Default');
    }
}
function chatAiReasoningVariantLabel(id, label) {
    return label || CHAT_AI_REASONING_VARIANT_LABELS[id] || id;
}
function chatAiServiceTierLabel(tier) {
    return CHAT_AI_SERVICE_TIER_LABELS[tier] ?? tier;
}
function chatAiMenuWidth(menu) {
    if (menu === 'provider') {
        return 240;
    }
    if (menu === 'model') {
        return 420;
    }
    return 190;
}
function chatAiBadgeTone(label) {
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
    if (normalized.includes('context') || normalized.includes('cache') || normalized.includes('temperature') || normalized.includes('attachment')) {
        return 'capability';
    }
    if (normalized.includes('unknown')) {
        return 'unknown';
    }
    if (normalized.includes('text only')) {
        return 'muted';
    }
    return 'capability';
}
function chatAiBadgeIcon(label) {
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
    if (normalized.includes('attachment')) {
        return 'file-type-2';
    }
    if (normalized.includes('context')) {
        return 'workflow';
    }
    if (normalized.includes('cache')) {
        return 'workflow';
    }
    if (normalized.includes('temperature')) {
        return 'workflow';
    }
    if (normalized.includes('reasoning')) {
        return 'brain';
    }
    if (normalized.includes('tools') || normalized.includes('web search')) {
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
function normalizeCyberVinciFlowChatMode(value) {
    return value === 'saved' || value === 'dynamic' ? value : 'chat';
}
function normalizeCyberVinciChatMode(value) {
    return value === 'edit' ||
        value === 'plan' ||
        value === 'readonly' ||
        value === 'workspace' ||
        value === 'fullaccess' ||
        value === 'agent-next'
        ? value
        : 'chat';
}
function cyberVinciChatModeToRequestModeId(value) {
    return CHAT_MODE_REQUEST_MODE_IDS[normalizeCyberVinciChatMode(value)];
}
function normalizeVirtualReasoningMode(value) {
    return value === 'auto' || value === 'fast' || value === 'balanced' || value === 'deep' || value === 'coding' || value === 'research' || value === 'lats'
        ? value
        : 'off';
}
function hoverHandler(hoverService, content, position = 'top') {
    return event => {
        hoverService.requestHover({
            content,
            target: event.currentTarget,
            position
        });
    };
}
function positionCyberVinciChatMenu(rect, menuWidth, preferredMaxHeight) {
    const margin = 12;
    const gap = 6;
    const availableAbove = Math.max(0, rect.top - margin - gap);
    const availableBelow = Math.max(0, window.innerHeight - rect.bottom - margin - gap);
    const openAbove = availableAbove >= Math.min(preferredMaxHeight, 220) || availableAbove >= availableBelow;
    const availableHeight = Math.max(120, openAbove ? availableAbove : availableBelow);
    const maxHeight = Math.max(120, Math.min(preferredMaxHeight, availableHeight));
    const left = Math.min(window.innerWidth - menuWidth - margin, Math.max(margin, rect.right - menuWidth));
    if (openAbove) {
        return {
            position: 'fixed',
            left,
            bottom: Math.max(margin, window.innerHeight - rect.top + gap),
            width: menuWidth,
            maxHeight
        };
    }
    return {
        position: 'fixed',
        left,
        top: Math.min(window.innerHeight - margin - maxHeight, Math.max(margin, rect.bottom + gap)),
        width: menuWidth,
        maxHeight
    };
}
//# sourceMappingURL=cybervinci-chat-ai-execution-controls.js.map
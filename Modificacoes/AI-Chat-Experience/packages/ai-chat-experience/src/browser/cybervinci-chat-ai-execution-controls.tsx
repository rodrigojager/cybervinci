// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_MODEL_PROVIDER_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF,
    CODEX_CLI_REASONING_VARIANT_PREF,
    CODEX_CLI_RUNTIME_PREF,
    CODEX_CLI_SERVICE_TIER_PREF
} from '@cybervinci/ai-providers/lib/common/ai-providers-preferences';
import { CodexProviderOptions, CodexProviderRuntime } from '@cybervinci/ai-providers/lib/common';
import { ChatModel } from '@theia/ai-chat';
import {
    CyberVinciAiExecutionSelection,
    CyberVinciAiModelMetadata,
    CyberVinciAiProviderDescriptor,
    CyberVinciAiRuntimeService,
    CyberVinciAiVirtualReasoningMode
} from '@cybervinci/ai-runtime/lib/common';
import { HoverService } from '@theia/core/lib/browser';
import { CommandService, nls } from '@theia/core';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common/preferences';
import * as React from '@theia/core/shared/react';
import * as ReactDOM from '@theia/core/shared/react-dom';
import {
    CYBERVINCI_AI_CHAT_MODE_PREF,
    CYBERVINCI_AI_CHAT_FLOW_MODE_PREF,
    CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF
} from './cybervinci-ai-chat-experience-preferences';
import { CyberVinciChatGoalDialog } from './cybervinci-ai-chat-goal-dialog';
import { CyberVinciChatGoalService } from './cybervinci-ai-chat-goal-service';
import { formatGoalElapsed, formatGoalRunSummary } from './cybervinci-ai-chat-goal-status';

export type CyberVinciChatMode = 'chat' | 'edit' | 'plan' | 'readonly' | 'workspace' | 'fullaccess' | 'agent-next';
export type CyberVinciFlowChatMode = 'chat' | 'saved' | 'dynamic';
type ChatAiMenuKind = 'provider' | 'model' | 'effort' | 'variant' | 'serviceTier' | 'chatMode' | 'workflow' | 'virtual';
type ChatAiServiceTier = 'default' | NonNullable<CodexProviderOptions['serviceTier']>;
type ChatAiReasoningEffortOption = 'default' | 'low' | 'medium' | 'high' | 'xhigh';

interface ChatAiReasoningVariant {
    id: string;
    label: string;
    description?: string;
    options?: Record<string, unknown>;
    disabled?: boolean;
}

interface SelectOption<T extends string> {
    value: T;
    label: string;
}

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

const CHAT_AI_PROVIDER_PRESETS: CyberVinciAiProviderDescriptor[] = [
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

const CHAT_AI_REASONING_VARIANT_DEFAULT: ChatAiReasoningVariant = {
    id: 'default',
    label: 'Default',
    description: 'Use the provider and model default variant.'
};

const CHAT_AI_REASONING_VARIANT_LABELS: Record<string, string> = {
    default: 'Default',
    none: 'None',
    high: 'High',
    max: 'Max',
    thinking: 'Thinking'
};

const CHAT_AI_SERVICE_TIER_DEFAULT: ChatAiServiceTier = 'default';
const CHAT_AI_SERVICE_TIER_LABELS: Record<ChatAiServiceTier, string> = {
    default: 'Default',
    fast: 'Fast',
    flex: 'Flex'
};

const CHAT_MODE_OPTIONS: Array<SelectOption<CyberVinciChatMode>> = [
    { value: 'chat', label: nls.localizeByDefault('Chat') },
    { value: 'edit', label: nls.localizeByDefault('Edit') },
    { value: 'plan', label: nls.localizeByDefault('Plan') },
    { value: 'readonly', label: nls.localize('theia/cybervinci/ai-chat/chatMode/readonly', 'Read Only') },
    { value: 'workspace', label: nls.localize('theia/cybervinci/ai-chat/chatMode/workspace', 'Workspace') },
    { value: 'fullaccess', label: nls.localize('theia/cybervinci/ai-chat/chatMode/fullAccess', 'Full Access') },
    { value: 'agent-next', label: nls.localize('theia/cybervinci/ai-chat/chatMode/agentNext', 'Agent Next') }
];

const CHAT_MODE_REQUEST_MODE_IDS: Record<CyberVinciChatMode, string | undefined> = {
    chat: 'open-coder-system-agent-mode',
    edit: 'open-coder-system-edit',
    plan: 'ai-providers-plan',
    readonly: 'ai-providers-read-only',
    workspace: 'ai-providers-workspace-write',
    fullaccess: 'ai-providers-danger-full-access',
    'agent-next': 'open-coder-system-agent-mode-next'
};

const FLOW_MODE_OPTIONS: Array<SelectOption<CyberVinciFlowChatMode>> = [
    { value: 'chat', label: nls.localize('theia/cybervinci/ai-chat/flowMode/direct', 'Direct') },
    { value: 'saved', label: nls.localize('theia/cybervinci/ai-chat/flowMode/saved', 'Saved Flow') },
    { value: 'dynamic', label: nls.localize('theia/cybervinci/ai-chat/flowMode/dynamic', 'Dynamic Workflow') }
];

const VIRTUAL_REASONING_MENU_OPTIONS: Array<SelectOption<CyberVinciAiVirtualReasoningMode>> = [
    { value: 'off', label: nls.localizeByDefault('Off') },
    { value: 'auto', label: nls.localizeByDefault('Auto') },
    { value: 'fast', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/fast', 'Fast') },
    { value: 'balanced', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/balanced', 'Balanced') },
    { value: 'deep', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/deep', 'Deep') },
    { value: 'coding', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/coding', 'Coding') },
    { value: 'research', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/research', 'Research') },
    { value: 'lats', label: nls.localize('theia/cybervinci/ai-chat/virtualReasoning/lats', 'LATS') }
];

export const CyberVinciChatModeSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ preferenceService, disabled, hoverService }) => {
    const [currentMode, setCurrentMode] = React.useState(() =>
        normalizeCyberVinciChatMode(preferenceService.get<CyberVinciChatMode>(CYBERVINCI_AI_CHAT_MODE_PREF, 'chat'))
    );
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_MODE_PREF) {
                setCurrentMode(normalizeCyberVinciChatMode(preferenceService.get(CYBERVINCI_AI_CHAT_MODE_PREF, 'chat')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);

    const title = nls.localize('theia/cybervinci/ai-chat/chatMode/title', 'Chat mode');
    return (
        <CyberVinciCompactMenuButton
            menuKind='chatMode'
            className={`theia-ChatInput-ChatModeButton chat-mode-${currentMode}`}
            iconClass='codicon-comment-discussion'
            selectedLabel={CHAT_MODE_OPTIONS.find(option => option.value === currentMode)?.label ?? 'Chat'}
            title={title}
            disabled={disabled}
            hoverService={hoverService}
            options={CHAT_MODE_OPTIONS}
            selectedValue={currentMode}
            onSelect={async mode => {
                const normalized = normalizeCyberVinciChatMode(mode);
                setCurrentMode(normalized);
                await preferenceService.set(CYBERVINCI_AI_CHAT_MODE_PREF, normalized === 'chat' ? undefined : normalized, PreferenceScope.User);
            }}
        />
    );
};

export const CyberVinciChatWorkflowRoutingSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    currentMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
    onModeChange?: (mode: CyberVinciFlowChatMode) => void;
}> = ({ preferenceService, currentMode, disabled, hoverService, onModeChange }) => {
    const effectiveMode = normalizeCyberVinciFlowChatMode(currentMode);
    const title = nls.localize('theia/cybervinci/ai-chat/flowMode/title', 'Flow routing');
    return (
        <CyberVinciCompactMenuButton
            menuKind='workflow'
            className={`theia-ChatInput-FlowModeButton flow-mode-${effectiveMode}`}
            iconClass='codicon-git-branch'
            selectedLabel={FLOW_MODE_OPTIONS.find(option => option.value === effectiveMode)?.label ?? 'Direct'}
            title={title}
            disabled={disabled}
            hoverService={hoverService}
            options={FLOW_MODE_OPTIONS}
            selectedValue={effectiveMode}
            onSelect={async mode => {
                const normalized = normalizeCyberVinciFlowChatMode(mode);
                await preferenceService.set(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, normalized === 'chat' ? undefined : normalized, PreferenceScope.User);
                onModeChange?.(normalized);
            }}
        />
    );
};

export const CyberVinciChatVirtualReasoningSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ preferenceService, disabled, hoverService }) => {
    const [currentMode, setCurrentMode] = React.useState(() =>
        normalizeVirtualReasoningMode(preferenceService.get<CyberVinciAiVirtualReasoningMode>(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off'))
    );
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF) {
                setCurrentMode(normalizeVirtualReasoningMode(preferenceService.get(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);

    const title = nls.localize('theia/cybervinci/ai-chat/virtualReasoning/title', 'Virtual Reasoning');
    return (
        <CyberVinciCompactMenuButton
            menuKind='virtual'
            className={`theia-ChatInput-VirtualReasoningButton virtual-reasoning-${currentMode}${currentMode !== 'off' ? ' toggled' : ''}`}
            iconClass='codicon-lightbulb'
            selectedLabel={VIRTUAL_REASONING_MENU_OPTIONS.find(option => option.value === currentMode)?.label ?? 'Off'}
            title={title}
            disabled={disabled}
            hoverService={hoverService}
            options={VIRTUAL_REASONING_MENU_OPTIONS}
            selectedValue={currentMode}
            onSelect={async mode => {
                const normalized = normalizeVirtualReasoningMode(mode);
                setCurrentMode(normalized);
                await preferenceService.set(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, normalized === 'off' ? undefined : normalized, PreferenceScope.User);
            }}
        />
    );
};

export const CyberVinciChatVirtualToolsSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    goalService: CyberVinciChatGoalService;
    chatModel?: ChatModel;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ preferenceService, goalService, chatModel, disabled, hoverService }) => {
    const [currentReasoning, setCurrentReasoning] = React.useState(() =>
        normalizeVirtualReasoningMode(preferenceService.get<CyberVinciAiVirtualReasoningMode>(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off'))
    );
    const [open, setOpen] = React.useState(false);
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const [, setGoalVersion] = React.useState(0);
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const goal = goalService.getGoal(chatModel);

    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF) {
                setCurrentReasoning(normalizeVirtualReasoningMode(preferenceService.get(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, 'off')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);

    React.useEffect(() => {
        let disposed = false;
        goalService.ensureLoaded(chatModel).then(() => {
            if (!disposed) {
                setGoalVersion(version => version + 1);
            }
        }).catch(error => console.warn('Could not load CyberVinci virtual goal menu state:', error));
        const disposable = goalService.onDidChangeGoal(event => {
            if (!chatModel || event.chatModelId === chatModel.id) {
                setGoalVersion(version => version + 1);
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [goalService, chatModel]);

    React.useEffect(() => {
        if (goal?.status !== 'active') {
            return undefined;
        }
        const handle = window.setInterval(() => setGoalVersion(version => version + 1), 1000);
        return () => window.clearInterval(handle);
    }, [goal?.status, goal?.activeStartedAt]);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
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
        const updateMenuStyle = (): void => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            setMenuStyle(positionCyberVinciChatMenu(button.getBoundingClientRect(), 320, 460));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [open]);

    const setReasoningMode = async (mode: CyberVinciAiVirtualReasoningMode): Promise<void> => {
        const normalized = normalizeVirtualReasoningMode(mode);
        setCurrentReasoning(normalized);
        setOpen(false);
        await preferenceService.set(CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF, normalized === 'off' ? undefined : normalized, PreferenceScope.User);
    };
    const editGoal = async (): Promise<void> => {
        setOpen(false);
        const value = await new CyberVinciChatGoalDialog({
            title: goal
                ? nls.localize('theia/cybervinci/ai-chat/goal/editDialogTitle', 'Edit Virtual Goal')
                : nls.localize('theia/cybervinci/ai-chat/goal/setDialogTitle', 'Set Virtual Goal'),
            initialValue: goal?.objective,
            acceptLabel: nls.localizeByDefault('Save')
        }).open();
        if (value && chatModel) {
            await goalService.setVirtualGoal(chatModel, value, { preserveProgress: !!goal, maxRounds: goal?.maxRounds });
        }
    };
    const pauseOrResumeGoal = async (): Promise<void> => {
        if (!chatModel || !goal) {
            return;
        }
        setOpen(false);
        await goalService.updateStatus(chatModel, goal.status === 'active' ? 'paused' : 'active');
    };
    const completeGoal = async (): Promise<void> => {
        if (!chatModel || !goal) {
            return;
        }
        setOpen(false);
        await goalService.updateStatus(chatModel, 'complete');
    };
    const clearGoal = async (): Promise<void> => {
        if (!chatModel) {
            return;
        }
        setOpen(false);
        await goalService.clearGoal(chatModel);
    };

    const hasVirtualGoalSelection = !!goal && goal.status !== 'complete' && goal.status !== 'blocked';
    const toggled = currentReasoning !== 'off' || hasVirtualGoalSelection;
    const title = nls.localize('theia/cybervinci/ai-chat/virtualTools/title', 'Virtual Tools');
    const goalSummary = goal
        ? formatGoalRunSummary(goal, formatGoalElapsed(goalService.getElapsedSeconds(goal)))
        : nls.localize('theia/cybervinci/ai-chat/goal/noGoal', 'No virtual goal');
    const menu = open ? (
        <div className='theia-ChatInput-AiProviderMenu theia-ChatInput-VirtualToolsMenu' data-cybervinci-menu='virtual-tools' style={menuStyle} ref={menuRef}>
            <div className='theia-ChatInput-VirtualToolsSection'>
                <div className='theia-ChatInput-VirtualToolsSectionTitle'>
                    <span className={`theia-ChatInput-AiModelIcon${currentReasoning !== 'off' ? ' capability' : ''} cybervinci-product-icon cybervinci-product-icon-brain`} />
                    <span>{nls.localize('theia/cybervinci/ai-chat/virtualReasoning/title', 'Virtual Reasoning')}</span>
                </div>
                {VIRTUAL_REASONING_MENU_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        type='button'
                        className={`theia-ChatInput-AiProviderMenuOption${option.value === currentReasoning ? ' selected' : ''}`}
                        data-cybervinci-option={`virtual-reasoning:${option.value}`}
                        onClick={() => setReasoningMode(option.value)}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>{option.label}</span>
                    </button>
                ))}
            </div>
            <div className='theia-ChatInput-VirtualToolsSection'>
                <div className='theia-ChatInput-VirtualToolsSectionTitle'>
                    <span className={`theia-ChatInput-AiModelIcon${hasVirtualGoalSelection ? ' capability' : ''} cybervinci-product-icon cybervinci-product-icon-target`} />
                    <span>{nls.localize('theia/cybervinci/ai-chat/goal/virtualGoal', 'Virtual Goal')}</span>
                    <span className='theia-ChatInput-VirtualToolsSectionMeta'>{goalSummary}</span>
                </div>
                {goal && <div className='theia-ChatInput-VirtualToolsGoalSummary' title={goal.objective}>{goal.objective}</div>}
                <button
                    type='button'
                    className='theia-ChatInput-AiProviderMenuOption'
                    data-cybervinci-option='virtual-goal:set'
                    onClick={editGoal}
                    disabled={!chatModel}
                >
                    <span className='theia-ChatInput-AiProviderOptionName'>{goal ? nls.localizeByDefault('Edit') : nls.localize('theia/cybervinci/ai-chat/goal/set', 'Set Goal')}</span>
                    <span className='codicon codicon-edit' />
                </button>
                {goal && goal.status !== 'complete' && goal.status !== 'blocked' && (
                    <button
                        type='button'
                        className='theia-ChatInput-AiProviderMenuOption'
                        data-cybervinci-option='virtual-goal:pause-resume'
                        onClick={pauseOrResumeGoal}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>
                            {goal.status === 'active' ? nls.localizeByDefault('Pause') : nls.localize('theia/cybervinci/ai-chat/goal/resume', 'Resume')}
                        </span>
                        <span className={`codicon ${goal.status === 'active' ? 'codicon-debug-pause' : 'codicon-debug-start'}`} />
                    </button>
                )}
                {goal && goal.status !== 'complete' && (
                    <button
                        type='button'
                        className='theia-ChatInput-AiProviderMenuOption'
                        data-cybervinci-option='virtual-goal:complete'
                        onClick={completeGoal}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>{nls.localize('theia/cybervinci/ai-chat/goal/markComplete', 'Mark Complete')}</span>
                        <span className='codicon codicon-check' />
                    </button>
                )}
                {goal && (
                    <button
                        type='button'
                        className='theia-ChatInput-AiProviderMenuOption'
                        data-cybervinci-option='virtual-goal:clear'
                        onClick={clearGoal}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>{nls.localizeByDefault('Clear')}</span>
                        <span className='codicon codicon-close' />
                    </button>
                )}
            </div>
        </div>
    ) : undefined;

    return (
        <span className='theia-ChatInput-CompactControl' ref={rootRef}>
            <button
                ref={buttonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton compact theia-ChatInput-VirtualToolsButton${toggled ? ' toggled' : ''}`}
                disabled={disabled}
                data-cybervinci-control='virtual-tools'
                title={`${title}: ${currentReasoning !== 'off' ? `Reasoning ${currentReasoning}` : 'Reasoning off'}; ${goalSummary}`}
                aria-label={title}
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
                onMouseEnter={hoverHandler(hoverService, title)}
            >
                <span className={`theia-ChatInput-AiModelIcon${toggled ? ' capability' : ''} cybervinci-product-icon cybervinci-product-icon-virtual-cube`} />
                <span className='theia-ChatInput-AiProviderButtonLabel'>{title}</span>
                <span className='codicon codicon-chevron-down' />
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

export const CyberVinciChatAiExecutionControls: React.FunctionComponent<{
    aiRuntimeService?: CyberVinciAiRuntimeService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    flowMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ aiRuntimeService, preferenceService, commandService, flowMode, disabled, hoverService }) => {
    const [providers, setProviders] = React.useState<CyberVinciAiProviderDescriptor[]>(() => mergeChatAiProvidersWithFallbacks([]));
    const [selection, setSelection] = React.useState(() => readChatAiExecutionFromPreferences(preferenceService));
    const [openMenu, setOpenMenu] = React.useState<ChatAiMenuKind | undefined>();
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const [reloadVersion, setReloadVersion] = React.useState(0);
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const providerButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const modelButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const effortButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const variantButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const serviceTierButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);

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
    const showReasoningVariantControl = reasoningVariants.length > 1;

    const configureProvider = async (provider: CyberVinciAiProviderDescriptor): Promise<void> => {
        await commandService.executeCommand(AI_PROVIDERS_CONFIGURE_COMMAND, {
            providerId: provider.id,
            runtime: provider.runtime,
            modelProvider: provider.modelProvider,
            mode: 'credentials'
        });
        setReloadVersion(version => version + 1);
    };

    const applySelection = async (nextSelection: CyberVinciAiExecutionSelection): Promise<void> => {
        setSelection(nextSelection);
        await persistChatAiExecution(preferenceService, nextSelection);
    };

    const updateProvider = async (provider: CyberVinciAiProviderDescriptor): Promise<void> => {
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

    const updateModel = async (model: string): Promise<void> => {
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

    const updateEffort = async (effort: ChatAiReasoningEffortOption): Promise<void> => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            reasoningEffort: toExecutionReasoningEffort(effort)
        });
    };

    const updateVariant = async (variant: ChatAiReasoningVariant): Promise<void> => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            reasoningVariant: variant.id,
            reasoningVariantOptions: variant.options
        });
    };

    const updateServiceTier = async (serviceTier: ChatAiServiceTier): Promise<void> => {
        setOpenMenu(undefined);
        await applySelection({
            ...selection,
            serviceTier: toExecutionServiceTier(serviceTier)
        });
    };

    const toggleMenu = (menu: ChatAiMenuKind): void => {
        if (disabled) {
            return;
        }
        if (menu === 'provider' && openMenu !== menu) {
            setReloadVersion(version => version + 1);
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
    const reasoningVariantTitle = `${authoringMode ? 'Authoring model variant' : 'Model variant'}: ${chatAiReasoningVariantLabel(selectedVariant.id, selectedVariant.label)}`;
    const serviceTierTitle = `${authoringMode ? 'Authoring service tier' : 'Service tier'}: ${chatAiServiceTierLabel(selectedServiceTier)}`;
    const reasoningVariantActive = selectedVariant.id !== 'default';

    const menu = openMenu === 'provider' ? (
        <div className='theia-ChatInput-AiProviderMenu provider' data-cybervinci-menu='provider' style={menuStyle} ref={menuRef}>
            {providers.map(provider => {
                const needsConfiguration = !provider.available || !!provider.configurationRequired?.length;
                return (
                    <button
                        key={provider.id}
                        type='button'
                        className={`theia-ChatInput-AiProviderMenuOption provider${provider.id === selectedProvider.id ? ' selected' : ''}${needsConfiguration ? ' unavailable' : ''}`}
                        data-cybervinci-option={provider.id}
                        onClick={() => updateProvider(provider)}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>{provider.label}</span>
                        <span className='theia-ChatInput-AiProviderOptionDetail'>
                            {needsConfiguration
                                ? provider.message ?? provider.configurationRequired?.join(', ') ?? 'Configuration required'
                                : chatAiProviderRuntimeLabel(provider)}
                        </span>
                    </button>
                );
            })}
        </div>
    ) : openMenu === 'model' ? (
        <div className='theia-ChatInput-AiProviderMenu model' data-cybervinci-menu='model' style={menuStyle} ref={menuRef}>
            {models.map(model => {
                const metadata = modelMetadata.get(model);
                return (
                    <button
                        key={model}
                        type='button'
                        className={`theia-ChatInput-AiProviderMenuOption${model === selectedModel ? ' selected' : ''}${metadata?.unavailable ? ' unavailable' : ''}`}
                        data-cybervinci-option={model}
                        title={metadata?.unavailableReason}
                        onClick={() => updateModel(model)}
                    >
                        <span className='theia-ChatInput-AiProviderOptionName'>{model}</span>
                        <ChatAiModelBadges metadata={metadata} />
                    </button>
                );
            })}
        </div>
    ) : openMenu === 'effort' ? (
        <div className='theia-ChatInput-AiProviderMenu compact' data-cybervinci-menu='effort' style={menuStyle} ref={menuRef}>
            {effortOptions.map(effort => (
                <button
                    key={effort}
                    type='button'
                    className={`theia-ChatInput-AiProviderMenuOption${effort === selectedEffort ? ' selected' : ''}`}
                    data-cybervinci-option={effort}
                    onClick={() => updateEffort(effort)}
                >
                    <span className='theia-ChatInput-AiProviderOptionName'>{chatAiReasoningEffortLabel(effort)}</span>
                    {effort !== 'default' ? <span className='codicon codicon-lightbulb' title='Reasoning effort' /> : undefined}
                </button>
            ))}
        </div>
    ) : openMenu === 'variant' && showReasoningVariantControl ? (
        <div className='theia-ChatInput-AiProviderMenu compact' data-cybervinci-menu='variant' style={menuStyle} ref={menuRef}>
            {reasoningVariants.map(variant => (
                <button
                    key={variant.id}
                    type='button'
                    className={`theia-ChatInput-AiProviderMenuOption${variant.id === selectedVariant.id ? ' selected' : ''}`}
                    data-cybervinci-option={variant.id}
                    title={variant.description}
                    onClick={() => updateVariant(variant)}
                >
                    <span className='theia-ChatInput-AiProviderOptionName'>{chatAiReasoningVariantLabel(variant.id, variant.label)}</span>
                    {variant.id !== 'default' ? <span className='theia-ChatInput-AiModelIcon capability cybervinci-product-icon cybervinci-product-icon-brain' title='Model variant' /> : undefined}
                </button>
            ))}
        </div>
    ) : openMenu === 'serviceTier' ? (
        <div className='theia-ChatInput-AiProviderMenu compact' data-cybervinci-menu='serviceTier' style={menuStyle} ref={menuRef}>
            {serviceTiers.map(tier => (
                <button
                    key={tier}
                    type='button'
                    className={`theia-ChatInput-AiProviderMenuOption${tier === selectedServiceTier ? ' selected' : ''}`}
                    data-cybervinci-option={tier}
                    onClick={() => updateServiceTier(tier)}
                >
                    <span className='theia-ChatInput-AiProviderOptionName'>{chatAiServiceTierLabel(tier)}</span>
                    {tier !== 'default' ? <span className='codicon codicon-zap' title='Service tier' /> : undefined}
                </button>
            ))}
        </div>
    ) : undefined;

    return (
        <span className={`theia-ChatInput-AiProviderSelector${authoringMode ? ' workflow-authoring' : ''}${disabled ? ' disabled' : ''}`} ref={rootRef}>
            <button
                ref={providerButtonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton${providerNeedsConfiguration ? ' needs-configuration' : ''}`}
                disabled={disabled}
                data-cybervinci-control='provider'
                title={providerTitle}
                aria-label={providerTitle}
                onClick={() => toggleMenu('provider')}
                onMouseEnter={hoverHandler(hoverService, providerTitle, 'top')}
            >
                <span className='theia-ChatInput-AiProviderButtonLabel'>{selectedProvider.label}</span>
                <span className='codicon codicon-chevron-down' />
            </button>
            <button
                ref={modelButtonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton model${selectedModelMetadata?.unavailable ? ' needs-configuration' : ''}`}
                disabled={disabled || !models.length}
                data-cybervinci-control='model'
                title={modelTitle}
                aria-label={modelTitle}
                onClick={() => toggleMenu('model')}
                onMouseEnter={hoverHandler(hoverService, modelTitle, 'top')}
            >
                <span className='theia-ChatInput-AiProviderButtonLabel'>{selectedModel || 'Provider default'}</span>
                <span className='codicon codicon-chevron-down' />
            </button>
            <button
                ref={effortButtonRef}
                type='button'
                className='theia-ChatInput-AiProviderButton compact'
                disabled={disabled || effortOptions.length <= 1}
                data-cybervinci-control='effort'
                title={reasoningEffortTitle}
                aria-label={reasoningEffortTitle}
                onClick={() => toggleMenu('effort')}
            >
                <span className='codicon codicon-lightbulb' />
                <span className='theia-ChatInput-AiProviderButtonLabel'>{chatAiReasoningEffortLabel(selectedEffort)}</span>
            </button>
            {showReasoningVariantControl ? (
                <button
                    ref={variantButtonRef}
                    type='button'
                    className={`theia-ChatInput-AiProviderButton compact${reasoningVariantActive ? ' toggled' : ''}`}
                    disabled={disabled}
                    data-cybervinci-control='variant'
                    title={reasoningVariantTitle}
                    aria-label={reasoningVariantTitle}
                    onClick={() => toggleMenu('variant')}
                >
                    <span className={`theia-ChatInput-AiModelIcon${reasoningVariantActive ? ' capability' : ''} cybervinci-product-icon cybervinci-product-icon-brain`} />
                    <span className='theia-ChatInput-AiProviderButtonLabel'>{chatAiReasoningVariantLabel(selectedVariant.id, selectedVariant.label)}</span>
                </button>
            ) : undefined}
            <button
                ref={serviceTierButtonRef}
                type='button'
                className='theia-ChatInput-AiProviderButton compact'
                disabled={disabled || serviceTiers.length <= 1}
                data-cybervinci-control='serviceTier'
                title={serviceTierTitle}
                aria-label={serviceTierTitle}
                onClick={() => toggleMenu('serviceTier')}
            >
                <span className='codicon codicon-zap' />
                <span className='theia-ChatInput-AiProviderButtonLabel'>{chatAiServiceTierLabel(selectedServiceTier)}</span>
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

const CyberVinciCompactMenuButton = <T extends string>({
    menuKind,
    className,
    iconClass,
    selectedLabel,
    title,
    disabled,
    hoverService,
    options,
    selectedValue,
    onSelect
}: {
    menuKind: ChatAiMenuKind;
    className: string;
    iconClass: string;
    selectedLabel: string;
    title: string;
    disabled?: boolean;
    hoverService: HoverService;
    options: Array<SelectOption<T>>;
    selectedValue: T;
    onSelect: (value: T) => void | Promise<void>;
}): React.ReactElement => {
    const [open, setOpen] = React.useState(false);
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
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
        const updateMenuStyle = (): void => {
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

    const menu = open ? (
        <div className='theia-ChatInput-AiProviderMenu compact' data-cybervinci-menu={menuKind} style={menuStyle} ref={menuRef}>
            {options.map(option => (
                <button
                    key={option.value}
                    type='button'
                    className={`theia-ChatInput-AiProviderMenuOption${option.value === selectedValue ? ' selected' : ''}`}
                    data-cybervinci-option={option.value}
                    onClick={async () => {
                        setOpen(false);
                        await onSelect(option.value);
                    }}
                >
                    <span className='theia-ChatInput-AiProviderOptionName'>{option.label}</span>
                </button>
            ))}
        </div>
    ) : undefined;

    return (
        <span className='theia-ChatInput-CompactControl' ref={rootRef}>
            <button
                ref={buttonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton compact ${className}`}
                disabled={disabled}
                data-cybervinci-control={menuKind}
                title={title}
                aria-label={`${title}: ${selectedLabel}`}
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
                onMouseEnter={hoverHandler(hoverService, title)}
            >
                <span className={`codicon ${iconClass}`} />
                <span className='theia-ChatInput-AiProviderButtonLabel'>{selectedLabel}</span>
                <span className='codicon codicon-chevron-down' />
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

const ChatAiModelBadges: React.FunctionComponent<{
    metadata?: CyberVinciAiModelMetadata;
    labels?: string[];
    compact?: boolean;
}> = ({ metadata, labels, compact }) => {
    const badges = compact ? (labels ?? chatAiModelBadges(metadata)).slice(0, 2) : labels ?? chatAiModelBadges(metadata);
    if (!metadata && !labels) {
        return <span className='theia-ChatInput-AiProviderBadges'><ChatAiCapabilityIcon label='Capabilities unknown' /></span>;
    }
    if (!badges.length) {
        return <span className='theia-ChatInput-AiProviderBadges'><ChatAiCapabilityIcon label='Text only' /></span>;
    }
    return (
        <span className='theia-ChatInput-AiProviderBadges'>
            {badges.map(label => <ChatAiCapabilityIcon key={label} label={label} />)}
        </span>
    );
};

const ChatAiCapabilityIcon: React.FunctionComponent<{ label: string }> = ({ label }) => (
    <span
        className={`theia-ChatInput-AiModelIcon ${chatAiBadgeTone(label)} cybervinci-product-icon cybervinci-product-icon-${chatAiBadgeIcon(label)}`}
        title={label}
        aria-label={label}
    />
);

export function readChatAiExecutionFromPreferences(preferenceService: PreferenceService): CyberVinciAiExecutionSelection {
    const runtime = preferenceService.get<CodexProviderRuntime>(CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
    const modelProvider = preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
    const reasoningVariant = preferenceService.get<string>(CODEX_CLI_REASONING_VARIANT_PREF, undefined);
    const reasoningVariantOptions = preferenceService.get<Record<string, unknown>>(CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF, undefined);
    const reasoningEffort = preferenceService.get<CyberVinciAiExecutionSelection['reasoningEffort']>(CODEX_CLI_REASONING_EFFORT_PREF, undefined);
    const serviceTier = preferenceService.get<CodexProviderOptions['serviceTier']>(CODEX_CLI_SERVICE_TIER_PREF, undefined);
    return {
        providerId: runtime && modelProvider ? `${runtime}:${modelProvider}` : undefined,
        runtime,
        modelProvider,
        model: preferenceService.get<string>(CODEX_CLI_MODEL_PREF, undefined),
        reasoningEffort,
        reasoningVariant: reasoningVariant ?? 'default',
        reasoningVariantOptions,
        serviceTier,
        reasoningPolicy: 'auto'
    };
}

async function persistChatAiExecution(preferenceService: PreferenceService, selection: CyberVinciAiExecutionSelection): Promise<void> {
    await preferenceService.set(CODEX_CLI_RUNTIME_PREF, selection.runtime, PreferenceScope.User);
    await preferenceService.set(CODEX_CLI_MODEL_PROVIDER_PREF, selection.modelProvider, PreferenceScope.User);
    await preferenceService.set(CODEX_CLI_MODEL_PREF, selection.model?.trim() || undefined, PreferenceScope.User);
    await preferenceService.set(CODEX_CLI_REASONING_EFFORT_PREF, selection.reasoningEffort || undefined, PreferenceScope.User);
    await preferenceService.set(CODEX_CLI_REASONING_VARIANT_PREF, selection.reasoningVariant === 'default' ? undefined : selection.reasoningVariant, PreferenceScope.User);
    await preferenceService.set(
        CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF,
        selection.reasoningVariant && selection.reasoningVariant !== 'default' && selection.reasoningVariantOptions && Object.keys(selection.reasoningVariantOptions).length
            ? selection.reasoningVariantOptions
            : undefined,
        PreferenceScope.User
    );
    await preferenceService.set(CODEX_CLI_SERVICE_TIER_PREF, selection.serviceTier, PreferenceScope.User);
}

function chatAiSelectionsEqual(left: CyberVinciAiExecutionSelection, right: CyberVinciAiExecutionSelection): boolean {
    return left.providerId === right.providerId &&
        left.runtime === right.runtime &&
        left.modelProvider === right.modelProvider &&
        left.model === right.model &&
        left.reasoningEffort === right.reasoningEffort &&
        left.reasoningVariant === right.reasoningVariant &&
        left.serviceTier === right.serviceTier &&
        JSON.stringify(left.reasoningVariantOptions ?? {}) === JSON.stringify(right.reasoningVariantOptions ?? {});
}

function resolveChatAiProvider(
    providers: CyberVinciAiProviderDescriptor[],
    selection: CyberVinciAiExecutionSelection
): CyberVinciAiProviderDescriptor | undefined {
    return providers.find(provider => provider.id === selection.providerId)
        ?? providers.find(provider => provider.runtime === selection.runtime && provider.modelProvider === selection.modelProvider)
        ?? providers.find(provider => provider.available)
        ?? providers[0];
}

function normalizeChatAiSelectionForProvider(
    selection: CyberVinciAiExecutionSelection,
    provider: CyberVinciAiProviderDescriptor
): CyberVinciAiExecutionSelection {
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

function resolveChatAiModel(
    provider: CyberVinciAiProviderDescriptor,
    selectedModel: string | undefined,
    modelMetadata: Map<string, CyberVinciAiModelMetadata>
): string | undefined {
    const models = uniqueChatAiValues([provider.defaultModel, ...(provider.models ?? [])]);
    const selected = selectedModel?.trim();
    const isSelectable = (model: string): boolean => !modelMetadata.get(model)?.unavailable;
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

function resolveChatAiReasoningEfforts(
    provider: CyberVinciAiProviderDescriptor,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): ChatAiReasoningEffortOption[] {
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

function resolveSelectedChatAiReasoningEffort(
    selection: CyberVinciAiExecutionSelection,
    efforts: ChatAiReasoningEffortOption[]
): ChatAiReasoningEffortOption {
    const selected = selection.reasoningEffort && selection.reasoningEffort !== 'none' ? selection.reasoningEffort : 'default';
    return efforts.includes(selected as ChatAiReasoningEffortOption) ? selected as ChatAiReasoningEffortOption : 'default';
}

function resolveChatAiReasoningVariants(
    provider: CyberVinciAiProviderDescriptor,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): ChatAiReasoningVariant[] {
    const configured = metadata?.variants ? Object.entries(metadata.variants)
        .map(([id, variant]) => normalizeChatAiReasoningVariant(id, variant))
        .filter((variant): variant is ChatAiReasoningVariant => !!variant && !variant.disabled) : [];
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

function normalizeChatAiReasoningVariant(id: string, value: unknown): ChatAiReasoningVariant | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const variant = value as ChatAiReasoningVariant;
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

function chatAiReasoningVariant(id: string, options: Record<string, unknown>, description?: string): ChatAiReasoningVariant {
    return {
        id,
        label: chatAiReasoningVariantLabel(id),
        description,
        options
    };
}

function resolveSelectedChatAiReasoningVariant(
    selection: CyberVinciAiExecutionSelection,
    variants: ChatAiReasoningVariant[]
): ChatAiReasoningVariant {
    const selectedId = selection.reasoningVariant?.trim();
    return (selectedId ? variants.find(variant => variant.id === selectedId) : undefined)
        ?? variants[0]
        ?? CHAT_AI_REASONING_VARIANT_DEFAULT;
}

function resolveChatAiServiceTiers(
    provider: CyberVinciAiProviderDescriptor,
    model: string | undefined,
    metadata: CyberVinciAiModelMetadata | undefined
): ChatAiServiceTier[] {
    const normalizedModel = chatAiNormalizeModelFamily(model ?? metadata?.id ?? '');
    const openAiLike = /\b(gpt|o[1-9]|codex)\b/.test(normalizedModel)
        || provider.modelProvider === 'codex'
        || provider.runtime === 'codex-app-server';
    if (provider.runtime === 'codex-app-server' || (provider.runtime === 'direct-http' && openAiLike)) {
        return ['default', 'fast', 'flex'];
    }
    return ['default'];
}

function resolveSelectedChatAiServiceTier(
    selection: CyberVinciAiExecutionSelection,
    tiers: ChatAiServiceTier[]
): ChatAiServiceTier {
    const selected = selection.serviceTier ?? CHAT_AI_SERVICE_TIER_DEFAULT;
    return tiers.includes(selected) ? selected : CHAT_AI_SERVICE_TIER_DEFAULT;
}

function toExecutionReasoningEffort(effort: ChatAiReasoningEffortOption): CyberVinciAiExecutionSelection['reasoningEffort'] | undefined {
    return effort === 'default' ? undefined : effort;
}

function toExecutionServiceTier(tier: ChatAiServiceTier): CodexProviderOptions['serviceTier'] | undefined {
    return tier === 'default' ? undefined : tier;
}

function mergeChatAiProvidersWithFallbacks(runtimeProviders: CyberVinciAiProviderDescriptor[]): CyberVinciAiProviderDescriptor[] {
    const byId = new Map<string, CyberVinciAiProviderDescriptor>();
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

function mergeChatAiModelMetadata(
    models: string[],
    primary: CyberVinciAiModelMetadata[] | undefined,
    fallback: CyberVinciAiModelMetadata[] | undefined
): CyberVinciAiModelMetadata[] | undefined {
    const byId = new Map<string, CyberVinciAiModelMetadata>();
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

function chatAiDirectModelMetadata(id: string, cost: CyberVinciAiModelMetadata['cost'] | undefined): CyberVinciAiModelMetadata {
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

function chatAiOpenCodeZenModelCost(id: string): CyberVinciAiModelMetadata['cost'] {
    const normalized = id.toLowerCase();
    return normalized.endsWith(':free') || normalized.includes('-free') || normalized.endsWith('/big-pickle')
        ? 'free-limited'
        : 'paid';
}

function uniqueChatAiValues(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.map(value => value?.trim()).filter((value): value is string => !!value)));
}

function chatAiModelBadges(metadata: CyberVinciAiModelMetadata | undefined): string[] {
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
    ].filter((label): label is string => !!label);
}

function chatAiModelSupportsReasoning(metadata: CyberVinciAiModelMetadata | undefined, model: string | undefined): boolean {
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

function chatAiNormalizeModelFamily(model: string): string {
    const normalized = model.toLowerCase().replace(/^opencode-go\//, '').replace(/^opencode\//, '').replace(/^openrouter\//, '');
    return normalized.replace(/[:/._-]+/g, ' ');
}

function chatAiSupportsXHigh(normalizedModel: string): boolean {
    return /\b(gpt 5|codex|o3|o4)\b/.test(normalizedModel);
}

function chatAiReadRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value as Record<string, unknown>;
}

function chatAiContextLabel(contextLength: number): string {
    if (contextLength >= 1000000) {
        return `${Math.round(contextLength / 1000000)}M context`;
    }
    if (contextLength >= 1000) {
        return `${Math.round(contextLength / 1000)}K context`;
    }
    return `${contextLength} context`;
}

function chatAiModelCost(cost: NonNullable<CyberVinciAiModelMetadata['cost']>): string {
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

function chatAiProviderRuntimeLabel(provider: CyberVinciAiProviderDescriptor): string {
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

function chatAiSupportsInput(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return chatAiSupportsModality(metadata?.inputModalities, modality);
}

function chatAiSupportsOutput(metadata: CyberVinciAiModelMetadata | undefined, modality: string): boolean {
    return chatAiSupportsModality(metadata?.outputModalities, modality);
}

function chatAiSupportsModality(modalities: readonly string[] | undefined, modality: string): boolean {
    const expected = modality.toLowerCase();
    return modalities?.some(value => value.toLowerCase() === expected) ?? false;
}

function chatAiReasoningEffortLabel(effort: ChatAiReasoningEffortOption): string {
    switch (effort) {
        case 'low': return nls.localizeByDefault('Low');
        case 'medium': return nls.localizeByDefault('Medium');
        case 'high': return nls.localizeByDefault('High');
        case 'xhigh': return nls.localize('theia/cybervinci/ai-chat/reasoning/xhigh', 'X High');
        default: return nls.localizeByDefault('Default');
    }
}

function chatAiReasoningVariantLabel(id: string, label?: string): string {
    return label || CHAT_AI_REASONING_VARIANT_LABELS[id] || id;
}

function chatAiServiceTierLabel(tier: ChatAiServiceTier): string {
    return CHAT_AI_SERVICE_TIER_LABELS[tier] ?? tier;
}

function chatAiMenuWidth(menu: ChatAiMenuKind): number {
    if (menu === 'provider') {
        return 240;
    }
    if (menu === 'model') {
        return 420;
    }
    return 190;
}

function chatAiBadgeTone(label: string): string {
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

function chatAiBadgeIcon(label: string): string {
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

export function normalizeCyberVinciFlowChatMode(value: unknown): CyberVinciFlowChatMode {
    return value === 'saved' || value === 'dynamic' ? value : 'chat';
}

export function normalizeCyberVinciChatMode(value: unknown): CyberVinciChatMode {
    return value === 'edit' ||
        value === 'plan' ||
        value === 'readonly' ||
        value === 'workspace' ||
        value === 'fullaccess' ||
        value === 'agent-next'
        ? value
        : 'chat';
}

export function cyberVinciChatModeToRequestModeId(value: unknown): string | undefined {
    return CHAT_MODE_REQUEST_MODE_IDS[normalizeCyberVinciChatMode(value)];
}

export function normalizeVirtualReasoningMode(value: unknown): CyberVinciAiVirtualReasoningMode {
    return value === 'auto' || value === 'fast' || value === 'balanced' || value === 'deep' || value === 'coding' || value === 'research' || value === 'lats'
        ? value
        : 'off';
}

export function hoverHandler(hoverService: HoverService, content: string, position: 'top' | 'bottom' | 'left' | 'right' = 'top'): (event: React.MouseEvent) => void {
    return event => {
        hoverService.requestHover({
            content,
            target: event.currentTarget as HTMLElement,
            position
        });
    };
}

export function positionCyberVinciChatMenu(rect: DOMRect, menuWidth: number, preferredMaxHeight: number): React.CSSProperties {
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

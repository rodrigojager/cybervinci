// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Command, CommandContribution, CommandRegistry, MessageService, nls, PreferenceScope, PreferenceService } from '@theia/core';
import { AGENT_SETTINGS_PREF } from '@theia/ai-core/lib/common/agent-preferences';
import { codicon } from '@theia/core/lib/browser';
import { QuickInputService } from '@theia/core/lib/browser/quick-input';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OutputChannelManager } from '@theia/output/lib/browser/output-channel';
import {
    CODEX_CLI_APPROVAL_POLICY_PREF,
    CODEX_CLI_CLAUDE_AGENT_PREF,
    CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_MODE_PREF,
    CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_MODEL_PROVIDER_PREF,
    CODEX_CLI_OPENCODE_API_KEY_PREF,
    CODEX_CLI_OPENCODE_AGENT_PREF,
    CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_OPENCODE_VARIANT_PREF,
    CODEX_CLI_OPENROUTER_API_KEY_PREF,
    CODEX_CLI_PROFILE_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_RUNTIME_PREF,
    CODEX_CLI_SANDBOX_MODE_PREF,
    CODEX_CLI_SERVICE_TIER_PREF,
    CODEX_CLI_VERBOSITY_PREF,
    CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
    CODEX_CLI_WEB_SEARCH_PREF
} from '../common/ai-providers-preferences';
import { CodexProviderRuntime, CodexProviderStatus } from '../common/ai-providers-service';
import { CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL, CodexProviderFrontendService } from './ai-providers-frontend-service';
import { CODEX_CLI_LANGUAGE_MODEL_ID } from './ai-providers-language-model';

export const CODEX_CLI_LOGIN_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-login',
    category: 'AI Chat',
    iconClass: codicon('account'),
    label: 'CyberVinci AI Providers: Sign in with ChatGPT'
}, 'theia/ai-providers/loginCommand', 'theia/ai-chat/category');

export const CODEX_CLI_STATUS_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-status',
    category: 'AI Chat',
    iconClass: codicon('info'),
    label: 'CyberVinci AI Providers: Show Status'
}, 'theia/ai-providers/statusCommand', 'theia/ai-chat/category');

export const CODEX_CLI_RESTART_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-restart',
    category: 'AI Chat',
    iconClass: codicon('debug-restart'),
    label: 'CyberVinci AI Providers: Refresh Runtime'
}, 'theia/ai-providers/restartCommand', 'theia/ai-chat/category');

export const CODEX_CLI_SHOW_OUTPUT_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-show-output',
    category: 'AI Chat',
    iconClass: codicon('output'),
    label: 'CyberVinci AI Providers: Show Output'
}, 'theia/ai-providers/showOutputCommand', 'theia/ai-chat/category');

export const CODEX_CLI_CONFIGURE_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-configure',
    category: 'AI Chat',
    iconClass: codicon('settings-gear'),
    label: 'CyberVinci AI Providers: Configure'
}, 'theia/ai-providers/configureCommand', 'theia/ai-chat/category');

export const CODEX_CLI_USE_FOR_OPEN_CODER_COMMAND = Command.toLocalizedCommand({
    id: 'chat:ai-providers-use-for-open-coder',
    category: 'AI Chat',
    iconClass: codicon('plug'),
    label: 'CyberVinci AI Providers: Use for CyberVinci'
}, 'theia/ai-providers/useForOpenCoderCommand', 'theia/ai-chat/category');

interface PickValue {
    label: string;
    description?: string;
    preferenceName: string;
    value: string | undefined;
}

interface ProviderPickValue {
    label: string;
    description?: string;
    detail?: string;
    value: ProviderPreset;
}

interface ModelPickValue {
    label: string;
    description?: string;
    detail?: string;
    value?: string;
    custom?: boolean;
}

interface ReasoningPickValue {
    label: string;
    description?: string;
    value?: string;
}

type ProviderPreset = 'codex' | 'openrouter' | 'opencode-go' | 'opencode' | 'gemini' | 'claude-code' | 'cursor';

interface ProviderPresetConfig {
    runtime: CodexProviderRuntime;
    provider: string;
    defaultModel?: string;
    models?: string[];
}

// Fallback only; live Codex app-server model/list results take precedence.
const CODEX_MODEL_PRESETS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex-spark'];
const STALE_CODEX_MODEL_PRESETS = ['gpt-5-codex', 'gpt-5-mini'];

const PROVIDER_PRESET_CONFIG: Record<ProviderPreset, ProviderPresetConfig> = {
    codex: { runtime: 'codex-app-server', provider: 'codex', defaultModel: 'gpt-5.5', models: CODEX_MODEL_PRESETS },
    openrouter: { runtime: 'direct-http', provider: 'openrouter', defaultModel: 'openrouter/openai/gpt-5.5' },
    'opencode-go': { runtime: 'direct-http', provider: 'opencode-go', defaultModel: 'opencode-go/deepseek-v4-flash' },
    opencode: { runtime: 'direct-http', provider: 'opencode', defaultModel: 'opencode/gpt-5.5' },
    gemini: { runtime: 'gemini-cli', provider: 'gemini' },
    'claude-code': { runtime: 'claude-code-cli', provider: 'claude-code', defaultModel: 'sonnet' },
    cursor: { runtime: 'cursor-cli', provider: 'cursor' }
};

type ProviderConfigureTarget = ProviderPreset | {
    provider?: ProviderPreset;
    providerId?: string;
    runtime?: CodexProviderRuntime;
    modelProvider?: string;
    mode?: 'credentials' | 'provider-model';
};

@injectable()
export class CodexProviderCommandContribution implements CommandContribution {

    @inject(CodexProviderFrontendService)
    protected readonly codexProvider: CodexProviderFrontendService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(OutputChannelManager)
    protected readonly outputChannelManager: OutputChannelManager;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CODEX_CLI_LOGIN_COMMAND, {
            execute: () => this.login()
        });
        commands.registerCommand(CODEX_CLI_STATUS_COMMAND, {
            execute: () => this.showStatus()
        });
        commands.registerCommand(CODEX_CLI_RESTART_COMMAND, {
            execute: () => this.restart()
        });
        commands.registerCommand(CODEX_CLI_SHOW_OUTPUT_COMMAND, {
            execute: () => this.outputChannelManager.getChannel(CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL).show()
        });
        commands.registerCommand(CODEX_CLI_CONFIGURE_COMMAND, {
            execute: (target?: ProviderConfigureTarget) => this.configure(target)
        });
        commands.registerCommand(CODEX_CLI_USE_FOR_OPEN_CODER_COMMAND, {
            execute: () => this.useForOpenCoder()
        });
    }

    protected async login(): Promise<void> {
        const result = await this.codexProvider.login();
        this.messageService.info(result.message ?? nls.localize('theia/ai-providers/loginStarted', 'CyberVinci AI Providers login started.'));
    }

    protected async showStatus(): Promise<void> {
        const status = await this.codexProvider.getStatus();
        const unknown = nls.localizeByDefault('Unknown');
        const defaultValue = nls.localizeByDefault('Default');
        const lines = [
            nls.localize('theia/ai-providers/status/status', 'Status: {0}',
                status.available === false ? nls.localize('theia/ai-providers/status/unavailable', 'Unavailable') : nls.localizeByDefault('Ready')),
            nls.localize('theia/ai-providers/status/runtime', 'Runtime: {0}', this.runtimeLabel(status.runtime)),
            nls.localize('theia/ai-providers/status/provider', 'Provider: {0}', status.modelProvider || 'codex'),
            nls.localize('theia/ai-providers/status/appServer', 'App server: {0}',
                status.appServer === false ? nls.localize('theia/ai-providers/status/notRunning', 'Not running') :
                    status.appServer ? nls.localizeByDefault('Running') : `(${unknown.toLowerCase()})`),
            nls.localize('theia/ai-providers/status/executable', 'Executable: {0}', status.executablePath ?? 'codex'),
            nls.localize('theia/ai-providers/status/version', 'Version: {0}', status.version || `(${unknown.toLowerCase()})`),
            nls.localize('theia/ai-providers/status/auth', 'Auth: {0}', status.authenticated === undefined ? status.authStatus || `(${unknown.toLowerCase()})` :
                status.authenticated ? nls.localize('theia/ai-providers/status/authenticated', 'Authenticated') :
                    nls.localize('theia/ai-providers/status/notAuthenticated', 'Not authenticated')),
            status.accountLabel ? nls.localize('theia/ai-providers/status/account', 'Account: {0}', status.accountLabel) : undefined,
            nls.localize('theia/ai-providers/status/profile', 'Profile: {0}', status.profile || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/ai-providers/status/workspace', 'Workspace: {0}', status.cwd || nls.localize('theia/ai-providers/status/none', '(none)')),
            nls.localize('theia/ai-providers/status/model', 'Model: {0}', status.model || nls.localize('theia/ai-providers/status/providerDefault', '(provider default)')),
            status.models?.length ? nls.localize('theia/ai-providers/status/availableModels', 'Available models: {0}',
                `${status.models.slice(0, 12).join(', ')}${status.models.length > 12 ? ', ...' : ''}`) : undefined,
            nls.localize('theia/ai-providers/status/sandbox', 'Sandbox: {0}', status.sandboxMode || 'read-only'),
            nls.localize('theia/ai-providers/status/approval', 'Approval: {0}', status.approvalPolicy || 'on-request'),
            nls.localize('theia/ai-providers/status/reasoning', 'Reasoning: {0}', status.reasoningEffort || nls.localize('theia/ai-providers/status/chatSettingDefault', '(chat setting/default)')),
            nls.localize('theia/ai-providers/status/verbosity', 'Verbosity: {0}', status.verbosity || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/ai-providers/status/serviceTier', 'Service tier: {0}', status.serviceTier || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/ai-providers/status/webSearch', 'Web search: {0}', status.webSearch || nls.localizeByDefault('Disabled').toLowerCase()),
            nls.localize('theia/ai-providers/status/webSearchContext', 'Web search context: {0}', status.webSearchContextSize || 'medium'),
            status.configurationRequired?.length ? nls.localize('theia/ai-providers/status/configurationRequired',
                'Configuration required: {0}', status.configurationRequired.join(', ')) : undefined,
            status.message ? nls.localize('theia/ai-providers/status/message', 'Message: {0}', status.message) : undefined
        ].filter((line): line is string => !!line);
        this.messageService.info(lines.join('\n'));
    }

    protected async restart(): Promise<void> {
        const status = await this.codexProvider.restart();
        this.messageService.info(status.available === false
            ? nls.localize('theia/ai-providers/restartFailed', 'AI provider runtime could not be restarted: {0}', status.message ?? 'unknown error')
            : nls.localize('theia/ai-providers/restarted', 'AI provider runtime refreshed.'));
    }

    protected async configure(target?: ProviderConfigureTarget): Promise<void> {
        const targetProvider = this.resolveProviderPreset(target);
        if (targetProvider) {
            if (typeof target !== 'string' && target?.mode === 'credentials') {
                await this.configureProviderCredentials(targetProvider, true);
                return;
            }
            await this.configureProviderModel(targetProvider);
            return;
        }
        const selected = await this.quickInputService.pick<PickValue>([
            {
                label: nls.localize('theia/ai-providers/configure/useForCyberVinci', 'Use CyberVinci AI Providers'),
                description: nls.localize('theia/ai-providers/configure/useForCyberVinciDescription', 'Select CyberVinci AI Providers as the coding and Canvas provider'),
                preferenceName: AGENT_SETTINGS_PREF,
                value: CODEX_CLI_LANGUAGE_MODEL_ID
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerModel', 'Provider / Model / Reasoning'),
                description: nls.localize('theia/ai-providers/configure/providerModelDescription', 'Choose provider, model, and reasoning effort in one searchable flow'),
                preferenceName: '__cybervinci_ai_provider_model',
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerCodex', 'Provider: Codex CLI'),
                description: nls.localize('theia/ai-providers/configure/providerCodexDescription', 'Use the Codex CLI app-server adapter'),
                preferenceName: '__codex_provider_preset',
                value: 'codex'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerOpenRouter', 'Provider: OpenRouter'),
                description: nls.localize('theia/ai-providers/configure/providerOpenRouterDescription', 'Use OpenRouter through its direct API'),
                preferenceName: '__codex_provider_preset',
                value: 'openrouter'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerOpenCodeGo', 'Provider: OpenCode Go'),
                description: nls.localize('theia/ai-providers/configure/providerOpenCodeGoDescription', 'Use OpenCode Go through its direct API'),
                preferenceName: '__codex_provider_preset',
                value: 'opencode-go'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerOpenCodeZen', 'Provider: OpenCode Zen'),
                description: nls.localize('theia/ai-providers/configure/providerOpenCodeZenDescription', 'Use OpenCode Zen through its direct API'),
                preferenceName: '__codex_provider_preset',
                value: 'opencode'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerGemini', 'Provider: Gemini CLI'),
                description: nls.localize('theia/ai-providers/configure/providerGeminiDescription', 'Use Gemini CLI headless mode'),
                preferenceName: '__codex_provider_preset',
                value: 'gemini'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerClaudeCode', 'Provider: Claude Code'),
                description: nls.localize('theia/ai-providers/configure/providerClaudeCodeDescription', 'Use Claude Code print mode'),
                preferenceName: '__codex_provider_preset',
                value: 'claude-code'
            },
            {
                label: nls.localize('theia/ai-providers/configure/providerCursor', 'Provider: Cursor CLI'),
                description: nls.localize('theia/ai-providers/configure/providerCursorDescription', 'Use Cursor Agent print mode'),
                preferenceName: '__codex_provider_preset',
                value: 'cursor'
            },
            {
                label: nls.localizeByDefault('Model'),
                description: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '') || nls.localize('theia/ai-providers/configure/providerDefault', 'Provider default'),
                preferenceName: CODEX_CLI_MODEL_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/openRouterApiKey', 'OpenRouter API Key'),
                description: this.preferenceService.get<string>(CODEX_CLI_OPENROUTER_API_KEY_PREF, '') ? nls.localizeByDefault('Configured') : 'OPENROUTER_API_KEY',
                preferenceName: CODEX_CLI_OPENROUTER_API_KEY_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/openCodeApiKey', 'OpenCode API Key'),
                description: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_API_KEY_PREF, '') ? nls.localizeByDefault('Configured') : 'OPENCODE_API_KEY',
                preferenceName: CODEX_CLI_OPENCODE_API_KEY_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/openCodeExecutable', 'OpenCode Executable'),
                description: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, '') || 'opencode',
                preferenceName: CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/openCodeAgent', 'OpenCode Agent'),
                description: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_AGENT_PREF, '') || nls.localizeByDefault('Default'),
                preferenceName: CODEX_CLI_OPENCODE_AGENT_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/openCodeVariant', 'OpenCode Variant'),
                description: this.preferenceService.get<string>(CODEX_CLI_OPENCODE_VARIANT_PREF, '') || nls.localizeByDefault('Default'),
                preferenceName: CODEX_CLI_OPENCODE_VARIANT_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/geminiExecutable', 'Gemini Executable'),
                description: this.preferenceService.get<string>(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, '') || 'gemini',
                preferenceName: CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/claudeExecutable', 'Claude Executable'),
                description: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, '') || 'claude',
                preferenceName: CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/claudeAgent', 'Claude Agent'),
                description: this.preferenceService.get<string>(CODEX_CLI_CLAUDE_AGENT_PREF, '') || nls.localizeByDefault('Default'),
                preferenceName: CODEX_CLI_CLAUDE_AGENT_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/cursorExecutable', 'Cursor Executable'),
                description: this.preferenceService.get<string>(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, '') || 'cursor-agent',
                preferenceName: CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/cursorMode', 'Cursor Mode'),
                description: this.preferenceService.get<string>(CODEX_CLI_CURSOR_MODE_PREF, '') || nls.localizeByDefault('Default'),
                preferenceName: CODEX_CLI_CURSOR_MODE_PREF,
                value: undefined
            },
            {
                label: nls.localizeByDefault('Profile'),
                description: this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, '') || nls.localize('theia/ai-providers/configure/defaultProfile', 'Default profile'),
                preferenceName: CODEX_CLI_PROFILE_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/refreshRuntime', 'Refresh Runtime'),
                description: nls.localize('theia/ai-providers/configure/refreshRuntimeDescription', 'Refresh the active AI provider runtime after configuration or auth changes'),
                preferenceName: '__codex_cli_restart',
                value: undefined
            },
            {
                label: nls.localize('theia/ai-providers/configure/sandboxReadOnly', 'Sandbox: Read-Only'),
                description: nls.localize('theia/ai-providers/configure/noFileWrites', 'No file writes'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'read-only'
            },
            {
                label: nls.localize('theia/ai-providers/configure/sandboxWorkspaceWrite', 'Sandbox: Workspace Write'),
                description: nls.localize('theia/ai-providers/configure/allowWorkspaceWrites', 'Allow writes in the workspace'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'workspace-write'
            },
            {
                label: nls.localize('theia/ai-providers/configure/sandboxFullAccess', 'Sandbox: Full Access'),
                description: nls.localize('theia/ai-providers/configure/allowUnrestrictedLocalAccess', 'Allow unrestricted local access'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'danger-full-access'
            },
            { label: nls.localize('theia/ai-providers/configure/approvalOnRequest', 'Approval: On Request'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'on-request' },
            { label: nls.localize('theia/ai-providers/configure/approvalOnFailure', 'Approval: On Failure'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'on-failure' },
            { label: nls.localize('theia/ai-providers/configure/approvalNever', 'Approval: Never'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'never' },
            { label: nls.localize('theia/ai-providers/configure/reasoningLow', 'Reasoning: Low'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'low' },
            { label: nls.localize('theia/ai-providers/configure/reasoningMedium', 'Reasoning: Medium'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'medium' },
            { label: nls.localize('theia/ai-providers/configure/reasoningHigh', 'Reasoning: High'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'high' },
            { label: nls.localize('theia/ai-providers/configure/reasoningClearOverride', 'Reasoning: Clear Override'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: undefined },
            { label: nls.localize('theia/ai-providers/configure/verbosityLow', 'Verbosity: Low'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'low' },
            { label: nls.localize('theia/ai-providers/configure/verbosityMedium', 'Verbosity: Medium'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'medium' },
            { label: nls.localize('theia/ai-providers/configure/verbosityHigh', 'Verbosity: High'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'high' },
            { label: nls.localize('theia/ai-providers/configure/serviceTierFast', 'Service Tier: Fast'), preferenceName: CODEX_CLI_SERVICE_TIER_PREF, value: 'fast' },
            { label: nls.localize('theia/ai-providers/configure/serviceTierFlex', 'Service Tier: Flex'), preferenceName: CODEX_CLI_SERVICE_TIER_PREF, value: 'flex' },
            { label: nls.localize('theia/ai-providers/configure/webSearchDisabled', 'Web Search: Disabled'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'disabled' },
            { label: nls.localize('theia/ai-providers/configure/webSearchCached', 'Web Search: Cached'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'cached' },
            { label: nls.localize('theia/ai-providers/configure/webSearchLive', 'Web Search: Live'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'live' },
            { label: nls.localize('theia/ai-providers/configure/webSearchContextLow', 'Web Search Context: Low'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'low' },
            { label: nls.localize('theia/ai-providers/configure/webSearchContextMedium', 'Web Search Context: Medium'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'medium' },
            { label: nls.localize('theia/ai-providers/configure/webSearchContextHigh', 'Web Search Context: High'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'high' }
        ], {
            canPickMany: false,
            placeHolder: nls.localize('theia/ai-providers/configurePlaceholder', 'Configure CyberVinci AI Providers')
        });

        if (!selected) {
            return;
        }
        if (selected.preferenceName === AGENT_SETTINGS_PREF) {
            await this.useForOpenCoder();
            return;
        }
        if (selected.preferenceName === '__codex_cli_restart') {
            await this.restart();
            return;
        }
        if (selected.preferenceName === '__cybervinci_ai_provider_model') {
            await this.configureProviderModel();
            return;
        }
        if (selected.preferenceName === '__codex_provider_preset') {
            await this.applyProviderPreset(selected.value as ProviderPreset);
            return;
        }
        let value = selected.value;
        if (selected.preferenceName === CODEX_CLI_MODEL_PREF ||
            selected.preferenceName === CODEX_CLI_PROFILE_PREF ||
            selected.preferenceName === CODEX_CLI_OPENROUTER_API_KEY_PREF ||
            selected.preferenceName === CODEX_CLI_OPENCODE_API_KEY_PREF ||
            selected.preferenceName === CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF ||
            selected.preferenceName === CODEX_CLI_OPENCODE_AGENT_PREF ||
            selected.preferenceName === CODEX_CLI_OPENCODE_VARIANT_PREF ||
            selected.preferenceName === CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF ||
            selected.preferenceName === CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF ||
            selected.preferenceName === CODEX_CLI_CLAUDE_AGENT_PREF ||
            selected.preferenceName === CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF ||
            selected.preferenceName === CODEX_CLI_CURSOR_MODE_PREF) {
            const placeholders: Record<string, string> = {
                [CODEX_CLI_MODEL_PREF]: 'sonnet',
                [CODEX_CLI_PROFILE_PREF]: 'default',
                [CODEX_CLI_OPENROUTER_API_KEY_PREF]: 'OPENROUTER_API_KEY',
                [CODEX_CLI_OPENCODE_API_KEY_PREF]: 'OPENCODE_API_KEY',
                [CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF]: 'opencode',
                [CODEX_CLI_OPENCODE_AGENT_PREF]: 'general',
                [CODEX_CLI_OPENCODE_VARIANT_PREF]: 'high',
                [CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF]: 'gemini',
                [CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF]: 'claude',
                [CODEX_CLI_CLAUDE_AGENT_PREF]: 'general',
                [CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF]: 'cursor-agent',
                [CODEX_CLI_CURSOR_MODE_PREF]: 'plan'
            };
            value = await this.quickInputService.input({
                placeHolder: placeholders[selected.preferenceName],
                prompt: selected.label,
                password: selected.preferenceName === CODEX_CLI_OPENROUTER_API_KEY_PREF || selected.preferenceName === CODEX_CLI_OPENCODE_API_KEY_PREF
            });
            if (value === undefined) {
                return;
            }
            value = value.trim() || undefined;
        }
        await this.preferenceService.set(selected.preferenceName, value, PreferenceScope.User);
        this.messageService.info(nls.localize('theia/ai-providers/configured', 'CyberVinci AI Providers setting updated: {0}', selected.preferenceName));
    }

    protected async configureProviderModel(initialPreset?: ProviderPreset): Promise<void> {
        const providerPick = initialPreset ? this.providerPickValues().find(candidate => candidate.value === initialPreset) : await this.quickInputService.pick<ProviderPickValue>(this.providerPickValues(), {
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: nls.localize('theia/ai-providers/configure/providerPlaceholder', 'Choose an AI provider')
        });
        if (!providerPick) {
            return;
        }
        if (!await this.configureProviderCredentialIfMissing(providerPick.value)) {
            return;
        }
        await this.applyProviderPreset(providerPick.value, false);
        const status = await this.codexProvider.getStatus();
        const modelPick = await this.pickModelForProvider(providerPick.value, status);
        if (!modelPick) {
            return;
        }
        let model = modelPick.value;
        if (modelPick.custom) {
            const input = await this.quickInputService.input({
                placeHolder: this.defaultModelPlaceholder(providerPick.value),
                prompt: nls.localize('theia/ai-providers/configure/customModelPrompt', 'Model id')
            });
            if (input === undefined) {
                return;
            }
            model = input.trim();
        }
        await this.preferenceService.set(CODEX_CLI_MODEL_PREF, model?.trim() || undefined, PreferenceScope.User);
        const reasoningPick = await this.pickReasoningEffort();
        if (reasoningPick) {
            await this.preferenceService.set(CODEX_CLI_REASONING_EFFORT_PREF, reasoningPick.value, PreferenceScope.User);
        }
        this.messageService.info(nls.localize(
            'theia/ai-providers/providerModelApplied',
            'AI provider/model changed to {0}{1}{2}.',
            this.providerLabel(providerPick.value),
            model ? ` / ${model}` : '',
            reasoningPick ? ` / ${reasoningPick.label}` : ''
        ));
    }

    protected async pickModelForProvider(preset: ProviderPreset, status: CodexProviderStatus): Promise<ModelPickValue | undefined> {
        const config = PROVIDER_PRESET_CONFIG[preset];
        const currentModel = this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '');
        const currentProviderModel = currentModel && this.modelMatchesProvider(currentModel, preset) && !this.isStaleCodexPreset(currentModel, preset)
            ? currentModel
            : undefined;
        const statusModels = status.runtime === config.runtime && status.modelProvider === config.provider ? status.models ?? [] : [];
        const models = Array.from(new Set([
            currentProviderModel,
            ...statusModels,
            config.defaultModel,
            ...(config.models ?? [])
        ].filter((model): model is string => !!model)));
        if (!models.length) {
            const input = await this.quickInputService.input({
                placeHolder: this.defaultModelPlaceholder(preset),
                prompt: nls.localize('theia/ai-providers/configure/modelPrompt', 'Model id')
            });
            if (input === undefined) {
                return undefined;
            }
            return {
                label: nls.localize('theia/ai-providers/configure/customModel', 'Custom model'),
                value: input.trim()
            };
        }
        return this.quickInputService.pick<ModelPickValue>([
            {
                label: nls.localize('theia/ai-providers/configure/providerDefault', 'Provider default'),
                description: this.defaultModelPlaceholder(preset),
                value: ''
            },
            ...models.map(model => ({
                label: model,
                description: this.providerLabel(preset),
                detail: this.modelDetail(model, status),
                value: model
            })),
            {
                label: nls.localize('theia/ai-providers/configure/customModel', 'Custom model'),
                description: nls.localize('theia/ai-providers/configure/customModelDescription', 'Type a model id that is not listed'),
                value: '',
                custom: true
            }
        ], {
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: nls.localize(
                'theia/ai-providers/configure/modelPlaceholder',
                'Choose model for {0}',
                this.providerLabel(preset)
            )
        });
    }

    protected async pickReasoningEffort(): Promise<ReasoningPickValue | undefined> {
        const current = this.preferenceService.get<string>(CODEX_CLI_REASONING_EFFORT_PREF, '');
        return this.quickInputService.pick<ReasoningPickValue>([
            {
                label: nls.localize('theia/ai-providers/configure/providerDefault', 'Provider default'),
                description: current ? nls.localize('theia/ai-providers/configure/clearCurrentReasoning', 'Clear current reasoning override') : undefined,
                value: undefined
            },
            { label: 'Reasoning: Low', value: 'low' },
            { label: 'Reasoning: Medium', value: 'medium' },
            { label: 'Reasoning: High', value: 'high' },
            { label: 'Reasoning: X High', value: 'xhigh' }
        ], {
            canPickMany: false,
            matchOnDescription: true,
            placeHolder: nls.localize('theia/ai-providers/configure/reasoningPlaceholder', 'Choose reasoning effort')
        });
    }

    protected async configureProviderCredentialIfMissing(preset: ProviderPreset, force = false): Promise<boolean> {
        const preferenceName = preset === 'openrouter'
            ? CODEX_CLI_OPENROUTER_API_KEY_PREF
            : preset === 'opencode-go' || preset === 'opencode'
                ? CODEX_CLI_OPENCODE_API_KEY_PREF
                : undefined;
        if (!preferenceName || (!force && this.preferenceService.get<string>(preferenceName, ''))) {
            return true;
        }
        const value = await this.quickInputService.input({
            placeHolder: preset === 'openrouter' ? 'OPENROUTER_API_KEY' : 'OPENCODE_API_KEY',
            prompt: preset === 'openrouter'
                ? nls.localize('theia/ai-providers/configure/openRouterApiKey', 'OpenRouter API Key')
                : nls.localize('theia/ai-providers/configure/openCodeApiKey', 'OpenCode API Key'),
            password: true
        });
        if (value === undefined) {
            return false;
        }
        await this.preferenceService.set(preferenceName, value.trim() || undefined, PreferenceScope.User);
        return true;
    }

    protected async configureProviderCredentials(preset: ProviderPreset, force = false): Promise<boolean> {
        const configured = await this.configureProviderCredentialIfMissing(preset, force);
        if (configured) {
            this.messageService.info(nls.localize('theia/ai-providers/providerCredentialsConfigured', 'AI provider credentials updated for {0}.', this.providerLabel(preset)));
        }
        return configured;
    }

    protected providerPickValues(): ProviderPickValue[] {
        return [
            {
                label: 'OpenRouter',
                description: 'Direct API',
                detail: 'openrouter/provider-model, for example openrouter/openai/gpt-5.5',
                value: 'openrouter'
            },
            {
                label: 'OpenCode Go',
                description: 'Direct API',
                detail: 'opencode-go/model, for example opencode-go/deepseek-v4-flash',
                value: 'opencode-go'
            },
            {
                label: 'OpenCode Zen',
                description: 'Direct API',
                detail: 'opencode/model, for example opencode/gpt-5.5',
                value: 'opencode'
            },
            {
                label: 'Codex CLI',
                description: 'App server',
                detail: 'Uses Codex account/profile and native Codex model ids',
                value: 'codex'
            },
            {
                label: 'Gemini CLI',
                description: 'CLI',
                detail: 'Uses the installed Gemini CLI and native model names',
                value: 'gemini'
            },
            {
                label: 'Claude Code',
                description: 'CLI',
                detail: 'Uses the installed Claude Code CLI and native model names',
                value: 'claude-code'
            },
            {
                label: 'Cursor CLI',
                description: 'CLI',
                detail: 'Uses the installed Cursor Agent CLI and native model names',
                value: 'cursor'
            }
        ];
    }

    protected modelDetail(model: string, status: CodexProviderStatus): string | undefined {
        if (model === this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '')) {
            return nls.localizeByDefault('Current');
        }
        if (status.available === false && status.message) {
            return status.message;
        }
        return undefined;
    }

    protected defaultModelPlaceholder(preset: ProviderPreset): string {
        return PROVIDER_PRESET_CONFIG[preset].defaultModel || nls.localize('theia/ai-providers/configure/nativeModelName', 'Native model name');
    }

    protected async applyProviderPreset(preset: ProviderPreset, showMessage = true): Promise<void> {
        const config = PROVIDER_PRESET_CONFIG[preset];
        const previousProvider = this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
        const currentModel = this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '');
        await this.preferenceService.set(CODEX_CLI_RUNTIME_PREF, config.runtime, PreferenceScope.User);
        await this.preferenceService.set(CODEX_CLI_MODEL_PROVIDER_PREF, config.provider, PreferenceScope.User);
        if (config.defaultModel) {
            if (!currentModel || previousProvider !== config.provider || !this.modelMatchesProvider(currentModel, preset) || this.isStaleCodexPreset(currentModel, preset)) {
                await this.preferenceService.set(CODEX_CLI_MODEL_PREF, config.defaultModel, PreferenceScope.User);
            }
        } else if (previousProvider !== config.provider || !this.modelMatchesProvider(currentModel, preset)) {
            await this.preferenceService.set(CODEX_CLI_MODEL_PREF, undefined, PreferenceScope.User);
        }
        if (showMessage) {
            this.messageService.info(nls.localize('theia/ai-providers/providerPresetApplied', 'AI provider changed to {0}.', this.providerLabel(preset)));
        }
    }

    protected providerLabel(preset: ProviderPreset): string {
        if (preset === 'codex') {
            return 'Codex CLI';
        }
        if (preset === 'openrouter') {
            return 'OpenRouter';
        }
        if (preset === 'opencode-go') {
            return 'OpenCode Go';
        }
        if (preset === 'opencode') {
            return 'OpenCode Zen';
        }
        if (preset === 'gemini') {
            return 'Gemini CLI';
        }
        if (preset === 'claude-code') {
            return 'Claude Code';
        }
        return 'Cursor CLI';
    }

    protected modelMatchesProvider(model: string, preset: ProviderPreset): boolean {
        if (!model) {
            return true;
        }
        if (preset === 'openrouter' || preset === 'opencode-go' || preset === 'opencode') {
            return model.startsWith(`${preset}/`);
        }
        if (model.startsWith('openrouter/') || model.startsWith('opencode-go/') || model.startsWith('opencode/')) {
            return false;
        }
        return true;
    }

    protected isStaleCodexPreset(model: string, preset: ProviderPreset): boolean {
        return preset === 'codex' && STALE_CODEX_MODEL_PRESETS.includes(model);
    }

    protected resolveProviderPreset(target: ProviderConfigureTarget | undefined): ProviderPreset | undefined {
        if (!target) {
            return undefined;
        }
        if (typeof target === 'string') {
            return target in PROVIDER_PRESET_CONFIG ? target as ProviderPreset : undefined;
        }
        if (target.provider) {
            return target.provider;
        }
        const modelProvider = target.modelProvider ?? target.providerId?.split(':').pop();
        const runtime = target.runtime ?? (target.providerId?.includes(':') ? target.providerId.split(':')[0] as CodexProviderRuntime : undefined);
        return Object.entries(PROVIDER_PRESET_CONFIG)
            .find(([, config]) => config.provider === modelProvider && (!runtime || config.runtime === runtime))?.[0] as ProviderPreset | undefined;
    }

    protected runtimeLabel(runtime: CodexProviderRuntime | undefined): string {
        if (runtime === 'direct-http') {
            return 'Direct API';
        }
        if (runtime === 'opencode-cli') {
            return 'OpenCode CLI';
        }
        if (runtime === 'gemini-cli') {
            return 'Gemini CLI';
        }
        if (runtime === 'claude-code-cli') {
            return 'Claude Code CLI';
        }
        if (runtime === 'cursor-cli') {
            return 'Cursor CLI';
        }
        return 'Codex CLI app-server';
    }

    protected async useForOpenCoder(): Promise<void> {
        const current = this.preferenceService.get<Record<string, unknown>>(AGENT_SETTINGS_PREF, {});
        const openCoderSettings = typeof current.OpenCoder === 'object' && current.OpenCoder ? current.OpenCoder as Record<string, unknown> : {};
        const openPencilSettings = typeof current.OpenPencil === 'object' && current.OpenPencil ? current.OpenPencil as Record<string, unknown> : {};
        await this.preferenceService.set(AGENT_SETTINGS_PREF, {
            ...current,
            OpenCoder: {
                ...openCoderSettings,
                languageModelRequirements: [{
                    purpose: 'chat',
                    identifier: CODEX_CLI_LANGUAGE_MODEL_ID
                }]
            },
            OpenPencil: {
                ...openPencilSettings,
                languageModelRequirements: [
                    {
                        purpose: 'openpencil-design',
                        identifier: CODEX_CLI_LANGUAGE_MODEL_ID
                    },
                    {
                        purpose: 'chat',
                        identifier: CODEX_CLI_LANGUAGE_MODEL_ID
                    }
                ]
            }
        }, PreferenceScope.User);
        this.messageService.info(nls.localize('theia/ai-providers/openCoderProviderSelected', 'CyberVinci now uses CyberVinci AI Providers as its chat and Canvas provider.'));
    }
}

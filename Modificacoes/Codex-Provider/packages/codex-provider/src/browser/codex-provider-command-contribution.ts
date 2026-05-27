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
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_PROFILE_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_SANDBOX_MODE_PREF,
    CODEX_CLI_SERVICE_TIER_PREF,
    CODEX_CLI_VERBOSITY_PREF,
    CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
    CODEX_CLI_WEB_SEARCH_PREF
} from '../common/codex-provider-preferences';
import { CodexProviderFrontendService } from './codex-provider-frontend-service';
import { CODEX_CLI_LANGUAGE_MODEL_ID } from './codex-provider-language-model';

export const CODEX_CLI_LOGIN_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-login',
    category: 'AI Chat',
    iconClass: codicon('account'),
    label: 'Codex Provider: Sign in with ChatGPT'
}, 'theia/codex-provider/loginCommand', 'theia/ai-chat/category');

export const CODEX_CLI_STATUS_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-status',
    category: 'AI Chat',
    iconClass: codicon('info'),
    label: 'Codex Provider: Show Status'
}, 'theia/codex-provider/statusCommand', 'theia/ai-chat/category');

export const CODEX_CLI_RESTART_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-restart',
    category: 'AI Chat',
    iconClass: codicon('debug-restart'),
    label: 'Codex Provider: Restart App Server'
}, 'theia/codex-provider/restartCommand', 'theia/ai-chat/category');

export const CODEX_CLI_SHOW_OUTPUT_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-show-output',
    category: 'AI Chat',
    iconClass: codicon('output'),
    label: 'Codex Provider: Show Output'
}, 'theia/codex-provider/showOutputCommand', 'theia/ai-chat/category');

export const CODEX_CLI_CONFIGURE_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-configure',
    category: 'AI Chat',
    iconClass: codicon('settings-gear'),
    label: 'Codex Provider: Configure'
}, 'theia/codex-provider/configureCommand', 'theia/ai-chat/category');

export const CODEX_CLI_USE_FOR_OPEN_CODER_COMMAND = Command.toLocalizedCommand({
    id: 'chat:codex-provider-use-for-open-coder',
    category: 'AI Chat',
    iconClass: codicon('plug'),
    label: 'Codex Provider: Use for CyberVinci'
}, 'theia/codex-provider/useForOpenCoderCommand', 'theia/ai-chat/category');

interface PickValue {
    label: string;
    description?: string;
    preferenceName: string;
    value: string | undefined;
}

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
            execute: () => this.outputChannelManager.getChannel('Codex Provider').show()
        });
        commands.registerCommand(CODEX_CLI_CONFIGURE_COMMAND, {
            execute: () => this.configure()
        });
        commands.registerCommand(CODEX_CLI_USE_FOR_OPEN_CODER_COMMAND, {
            execute: () => this.useForOpenCoder()
        });
    }

    protected async login(): Promise<void> {
        const result = await this.codexProvider.login();
        this.messageService.info(result.message ?? nls.localize('theia/codex-provider/loginStarted', 'Codex Provider login started.'));
    }

    protected async showStatus(): Promise<void> {
        const status = await this.codexProvider.getStatus();
        const unknown = nls.localizeByDefault('Unknown');
        const defaultValue = nls.localizeByDefault('Default');
        const lines = [
            nls.localize('theia/codex-provider/status/status', 'Status: {0}',
                status.available === false ? nls.localize('theia/codex-provider/status/unavailable', 'Unavailable') : nls.localizeByDefault('Ready')),
            nls.localize('theia/codex-provider/status/appServer', 'App server: {0}',
                status.appServer === false ? nls.localize('theia/codex-provider/status/notRunning', 'Not running') :
                    status.appServer ? nls.localizeByDefault('Running') : `(${unknown.toLowerCase()})`),
            nls.localize('theia/codex-provider/status/executable', 'Executable: {0}', status.executablePath ?? 'codex'),
            nls.localize('theia/codex-provider/status/version', 'Version: {0}', status.version || `(${unknown.toLowerCase()})`),
            nls.localize('theia/codex-provider/status/auth', 'Auth: {0}', status.authenticated === undefined ? status.authStatus || `(${unknown.toLowerCase()})` :
                status.authenticated ? nls.localize('theia/codex-provider/status/authenticated', 'Authenticated') :
                    nls.localize('theia/codex-provider/status/notAuthenticated', 'Not authenticated')),
            status.accountLabel ? nls.localize('theia/codex-provider/status/account', 'Account: {0}', status.accountLabel) : undefined,
            nls.localize('theia/codex-provider/status/profile', 'Profile: {0}', status.profile || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/codex-provider/status/workspace', 'Workspace: {0}', status.cwd || nls.localize('theia/codex-provider/status/none', '(none)')),
            nls.localize('theia/codex-provider/status/model', 'Model: {0}', status.model || nls.localize('theia/codex-provider/status/codexProviderDefault', '(Codex Provider default)')),
            status.models?.length ? nls.localize('theia/codex-provider/status/availableModels', 'Available models: {0}',
                `${status.models.slice(0, 12).join(', ')}${status.models.length > 12 ? ', ...' : ''}`) : undefined,
            nls.localize('theia/codex-provider/status/sandbox', 'Sandbox: {0}', status.sandboxMode || 'read-only'),
            nls.localize('theia/codex-provider/status/approval', 'Approval: {0}', status.approvalPolicy || 'on-request'),
            nls.localize('theia/codex-provider/status/reasoning', 'Reasoning: {0}', status.reasoningEffort || nls.localize('theia/codex-provider/status/chatSettingDefault', '(chat setting/default)')),
            nls.localize('theia/codex-provider/status/verbosity', 'Verbosity: {0}', status.verbosity || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/codex-provider/status/serviceTier', 'Service tier: {0}', status.serviceTier || `(${defaultValue.toLowerCase()})`),
            nls.localize('theia/codex-provider/status/webSearch', 'Web search: {0}', status.webSearch || nls.localizeByDefault('Disabled').toLowerCase()),
            nls.localize('theia/codex-provider/status/webSearchContext', 'Web search context: {0}', status.webSearchContextSize || 'medium'),
            status.configurationRequired?.length ? nls.localize('theia/codex-provider/status/configurationRequired',
                'Configuration required: {0}', status.configurationRequired.join(', ')) : undefined,
            status.message ? nls.localize('theia/codex-provider/status/message', 'Message: {0}', status.message) : undefined
        ].filter((line): line is string => !!line);
        this.messageService.info(lines.join('\n'));
    }

    protected async restart(): Promise<void> {
        const status = await this.codexProvider.restart();
        this.messageService.info(status.available === false
            ? nls.localize('theia/codex-provider/restartFailed', 'Codex Provider app-server could not be restarted: {0}', status.message ?? 'unknown error')
            : nls.localize('theia/codex-provider/restarted', 'Codex Provider app-server restarted.'));
    }

    protected async configure(): Promise<void> {
        const selected = await this.quickInputService.pick<PickValue>([
            {
                label: nls.localize('theia/codex-provider/configure/useForCyberVinci', 'Use Codex Provider for CyberVinci'),
                description: nls.localize('theia/codex-provider/configure/useForCyberVinciDescription', 'Select Codex Provider as the CyberVinci coding provider'),
                preferenceName: AGENT_SETTINGS_PREF,
                value: CODEX_CLI_LANGUAGE_MODEL_ID
            },
            {
                label: nls.localizeByDefault('Model'),
                description: this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '') || nls.localize('theia/codex-provider/configure/codexProviderDefault', 'Codex Provider default'),
                preferenceName: CODEX_CLI_MODEL_PREF,
                value: undefined
            },
            {
                label: nls.localizeByDefault('Profile'),
                description: this.preferenceService.get<string>(CODEX_CLI_PROFILE_PREF, '') || nls.localize('theia/codex-provider/configure/defaultProfile', 'Default profile'),
                preferenceName: CODEX_CLI_PROFILE_PREF,
                value: undefined
            },
            {
                label: nls.localize('theia/codex-provider/configure/restartAppServer', 'Restart App Server'),
                description: nls.localize('theia/codex-provider/configure/restartAppServerDescription', 'Restart Codex Provider after configuration or auth changes'),
                preferenceName: '__codex_cli_restart',
                value: undefined
            },
            {
                label: nls.localize('theia/codex-provider/configure/sandboxReadOnly', 'Sandbox: Read-Only'),
                description: nls.localize('theia/codex-provider/configure/noFileWrites', 'No file writes'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'read-only'
            },
            {
                label: nls.localize('theia/codex-provider/configure/sandboxWorkspaceWrite', 'Sandbox: Workspace Write'),
                description: nls.localize('theia/codex-provider/configure/allowWorkspaceWrites', 'Allow writes in the workspace'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'workspace-write'
            },
            {
                label: nls.localize('theia/codex-provider/configure/sandboxFullAccess', 'Sandbox: Full Access'),
                description: nls.localize('theia/codex-provider/configure/allowUnrestrictedLocalAccess', 'Allow unrestricted local access'),
                preferenceName: CODEX_CLI_SANDBOX_MODE_PREF,
                value: 'danger-full-access'
            },
            { label: nls.localize('theia/codex-provider/configure/approvalOnRequest', 'Approval: On Request'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'on-request' },
            { label: nls.localize('theia/codex-provider/configure/approvalOnFailure', 'Approval: On Failure'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'on-failure' },
            { label: nls.localize('theia/codex-provider/configure/approvalNever', 'Approval: Never'), preferenceName: CODEX_CLI_APPROVAL_POLICY_PREF, value: 'never' },
            { label: nls.localize('theia/codex-provider/configure/reasoningLow', 'Reasoning: Low'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'low' },
            { label: nls.localize('theia/codex-provider/configure/reasoningMedium', 'Reasoning: Medium'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'medium' },
            { label: nls.localize('theia/codex-provider/configure/reasoningHigh', 'Reasoning: High'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: 'high' },
            { label: nls.localize('theia/codex-provider/configure/reasoningClearOverride', 'Reasoning: Clear Override'), preferenceName: CODEX_CLI_REASONING_EFFORT_PREF, value: undefined },
            { label: nls.localize('theia/codex-provider/configure/verbosityLow', 'Verbosity: Low'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'low' },
            { label: nls.localize('theia/codex-provider/configure/verbosityMedium', 'Verbosity: Medium'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'medium' },
            { label: nls.localize('theia/codex-provider/configure/verbosityHigh', 'Verbosity: High'), preferenceName: CODEX_CLI_VERBOSITY_PREF, value: 'high' },
            { label: nls.localize('theia/codex-provider/configure/serviceTierFast', 'Service Tier: Fast'), preferenceName: CODEX_CLI_SERVICE_TIER_PREF, value: 'fast' },
            { label: nls.localize('theia/codex-provider/configure/serviceTierFlex', 'Service Tier: Flex'), preferenceName: CODEX_CLI_SERVICE_TIER_PREF, value: 'flex' },
            { label: nls.localize('theia/codex-provider/configure/webSearchDisabled', 'Web Search: Disabled'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'disabled' },
            { label: nls.localize('theia/codex-provider/configure/webSearchCached', 'Web Search: Cached'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'cached' },
            { label: nls.localize('theia/codex-provider/configure/webSearchLive', 'Web Search: Live'), preferenceName: CODEX_CLI_WEB_SEARCH_PREF, value: 'live' },
            { label: nls.localize('theia/codex-provider/configure/webSearchContextLow', 'Web Search Context: Low'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'low' },
            { label: nls.localize('theia/codex-provider/configure/webSearchContextMedium', 'Web Search Context: Medium'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'medium' },
            { label: nls.localize('theia/codex-provider/configure/webSearchContextHigh', 'Web Search Context: High'), preferenceName: CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF, value: 'high' }
        ], {
            canPickMany: false,
            placeHolder: nls.localize('theia/codex-provider/configurePlaceholder', 'Configure Codex Provider')
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
        let value = selected.value;
        if (selected.preferenceName === CODEX_CLI_MODEL_PREF || selected.preferenceName === CODEX_CLI_PROFILE_PREF) {
            value = await this.quickInputService.input({
                placeHolder: selected.preferenceName === CODEX_CLI_MODEL_PREF ? 'gpt-5.1-codex' : 'default',
                prompt: selected.label
            });
            if (value === undefined) {
                return;
            }
            value = value.trim() || undefined;
        }
        await this.preferenceService.set(selected.preferenceName, value, PreferenceScope.User);
        this.messageService.info(nls.localize('theia/codex-provider/configured', 'Codex Provider setting updated: {0}', selected.preferenceName));
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
        this.messageService.info(nls.localize('theia/codex-provider/openCoderProviderSelected', 'CyberVinci now uses Codex Provider as its chat and Canvas provider.'));
    }
}

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AGENT_SETTINGS_PREF } from '@theia/ai-core/lib/common/agent-preferences';
import { PreferenceScope, PreferenceService, nls } from '@theia/core';
import { codicon } from '@theia/core/lib/browser';
import { QuickInputService } from '@theia/core/lib/browser/quick-input';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { OutputChannelManager } from '@theia/output/lib/browser/output-channel';
import {
    CODEX_CLI_APPROVAL_POLICY_PREF,
    CODEX_CLI_CLAUDE_AGENT_PREF,
    CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF,
    CODEX_CLI_CURSOR_MODE_PREF,
    CODEX_CLI_EXECUTABLE_PATH_PREF,
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
import { CodexProviderDetectedProvider, CodexProviderRuntime, CodexProviderStatus } from '../common/ai-providers-service';
import { CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL, CodexProviderFrontendService } from './ai-providers-frontend-service';
import { CODEX_CLI_LANGUAGE_MODEL_ID } from './ai-providers-language-model';

interface SelectOption<T extends string> {
    value: T | '';
    label: string;
}

interface CodexProviderLanguageModelRequirement {
    purpose: string;
    identifier: string;
}

interface CodexProviderModelPick {
    label: string;
    description?: string;
    detail?: string;
    value?: string;
    custom?: boolean;
}

type ProviderPreset = 'codex' | 'openrouter' | 'opencode-go' | 'opencode' | 'gemini' | 'claude-code' | 'cursor';

interface ProviderPresetConfig {
    runtime: CodexProviderRuntime;
    provider: string;
    defaultModel?: string;
}

const PROVIDER_PRESET_CONFIG: Record<ProviderPreset, ProviderPresetConfig> = {
    codex: { runtime: 'codex-app-server', provider: 'codex' },
    openrouter: { runtime: 'direct-http', provider: 'openrouter', defaultModel: 'openrouter/openai/gpt-5' },
    'opencode-go': { runtime: 'direct-http', provider: 'opencode-go', defaultModel: 'opencode-go/deepseek-v4-flash' },
    opencode: { runtime: 'direct-http', provider: 'opencode', defaultModel: 'opencode/gpt-5-codex' },
    gemini: { runtime: 'gemini-cli', provider: 'gemini' },
    'claude-code': { runtime: 'claude-code-cli', provider: 'claude-code', defaultModel: 'sonnet' },
    cursor: { runtime: 'cursor-cli', provider: 'cursor' }
};

@injectable()
export class CodexProviderConfigurationWidget extends ReactWidget {

    static readonly ID = 'ai-providers-configuration-widget';
    static readonly LABEL = nls.localize('theia/ai-providers/configuration/widgetLabel', 'CyberVinci AI Providers');

    @inject(CodexProviderFrontendService)
    protected readonly codexProvider: CodexProviderFrontendService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(OutputChannelManager)
    protected readonly outputChannelManager: OutputChannelManager;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    protected status: CodexProviderStatus | undefined;

    @postConstruct()
    protected init(): void {
        this.id = CodexProviderConfigurationWidget.ID;
        this.title.label = CodexProviderConfigurationWidget.LABEL;
        this.title.closable = false;
        this.addClass('ai-configuration-widget');
        this.addClass('ai-providers-configuration-widget');
        this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName.startsWith('ai-features.aiProviders.') || event.preferenceName === AGENT_SETTINGS_PREF) {
                this.refreshStatus();
            }
        }));
        this.refreshStatus();
    }

    protected async refreshStatus(): Promise<void> {
        this.status = await this.codexProvider.getStatus();
        this.update();
    }

    protected async login(): Promise<void> {
        await this.codexProvider.login();
        await this.refreshStatus();
    }

    protected async restart(): Promise<void> {
        this.status = await this.codexProvider.restart();
        this.update();
    }

    protected async useForCyberVinci(): Promise<void> {
        await this.useForOpenCoder();
        await this.useForOpenPencil();
        this.update();
    }

    protected async useForOpenCoder(): Promise<void> {
        await this.setAgentLanguageModelRequirements('OpenCoder', [{
            purpose: 'chat',
            identifier: CODEX_CLI_LANGUAGE_MODEL_ID
        }]);
    }

    protected async useForOpenPencil(): Promise<void> {
        await this.setAgentLanguageModelRequirements('OpenPencil', [
            {
                purpose: 'openpencil-design',
                identifier: CODEX_CLI_LANGUAGE_MODEL_ID
            },
            {
                purpose: 'chat',
                identifier: CODEX_CLI_LANGUAGE_MODEL_ID
            }
        ]);
    }

    protected async setAgentLanguageModelRequirements(agentId: string, requirements: CodexProviderLanguageModelRequirement[]): Promise<void> {
        const current = this.preferenceService.get<Record<string, unknown>>(AGENT_SETTINGS_PREF, {});
        const agentSettings = typeof current[agentId] === 'object' && current[agentId] ? current[agentId] as Record<string, unknown> : {};
        const existingRequirements = Array.isArray(agentSettings.languageModelRequirements)
            ? agentSettings.languageModelRequirements.filter((requirement): requirement is CodexProviderLanguageModelRequirement =>
                typeof requirement === 'object' &&
                requirement !== null &&
                typeof (requirement as CodexProviderLanguageModelRequirement).purpose === 'string' &&
                typeof (requirement as CodexProviderLanguageModelRequirement).identifier === 'string'
            )
            : [];
        const nextPurposes = new Set(requirements.map(requirement => requirement.purpose));
        await this.preferenceService.set(AGENT_SETTINGS_PREF, {
            ...current,
            [agentId]: {
                ...agentSettings,
                languageModelRequirements: [
                    ...existingRequirements.filter(requirement => !nextPurposes.has(requirement.purpose)),
                    ...requirements
                ]
            }
        }, PreferenceScope.User);
    }

    protected async applyPreset(preset: 'readOnly' | 'agent' | 'fullAccess'): Promise<void> {
        if (preset === 'readOnly') {
            await this.preferenceService.set(CODEX_CLI_SANDBOX_MODE_PREF, 'read-only', PreferenceScope.User);
            await this.preferenceService.set(CODEX_CLI_APPROVAL_POLICY_PREF, 'never', PreferenceScope.User);
        } else if (preset === 'agent') {
            await this.preferenceService.set(CODEX_CLI_SANDBOX_MODE_PREF, 'workspace-write', PreferenceScope.User);
            await this.preferenceService.set(CODEX_CLI_APPROVAL_POLICY_PREF, 'on-request', PreferenceScope.User);
        } else {
            await this.preferenceService.set(CODEX_CLI_SANDBOX_MODE_PREF, 'danger-full-access', PreferenceScope.User);
            await this.preferenceService.set(CODEX_CLI_APPROVAL_POLICY_PREF, 'on-request', PreferenceScope.User);
        }
        this.update();
    }

    protected async applyProviderPreset(preset: ProviderPreset): Promise<void> {
        const config = PROVIDER_PRESET_CONFIG[preset];
        const previousProvider = this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, 'codex');
        const currentModel = this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '');
        await this.preferenceService.set(CODEX_CLI_RUNTIME_PREF, config.runtime, PreferenceScope.User);
        await this.preferenceService.set(CODEX_CLI_MODEL_PROVIDER_PREF, config.provider, PreferenceScope.User);
        if (config.defaultModel) {
            if (!currentModel || previousProvider !== config.provider || !this.modelMatchesProvider(currentModel, preset)) {
                await this.preferenceService.set(CODEX_CLI_MODEL_PREF, config.defaultModel, PreferenceScope.User);
            }
        } else if (previousProvider !== config.provider || !this.modelMatchesProvider(currentModel, preset)) {
            await this.preferenceService.set(CODEX_CLI_MODEL_PREF, undefined, PreferenceScope.User);
        }
        await this.refreshStatus();
    }

    protected async setPreference(preferenceName: string, value: string | undefined): Promise<void> {
        await this.preferenceService.set(preferenceName, value || undefined, PreferenceScope.User);
    }

    protected render(): React.ReactNode {
        const status = this.status;
        const available = status?.available !== false;
        const statusLabel = available
            ? nls.localize('theia/ai-providers/configuration/ready', 'Ready')
            : nls.localize('theia/ai-providers/configuration/unavailable', 'Unavailable');
        return (
            <div className="ai-configuration-widget-content">
                <div className="ai-providers-provider-header">
                    <div>
                        <div className="ai-providers-provider-title">
                            <span className={codicon('hubot')} />
                            <span>{nls.localize('theia/ai-providers/configuration/cyberVinciProvider', 'CyberVinci AI Providers')}</span>
                        </div>
                        <div className="ai-providers-provider-subtitle">
                            {nls.localize('theia/ai-providers/configuration/providerSubtitle',
                                'Provider adapters for Codex CLI, direct service APIs, Gemini CLI, Claude Code, and Cursor without patching the Theia core.')}
                        </div>
                    </div>
                    <div className="ai-providers-provider-actions">
                        <button className={`theia-button ${codicon('plug')}`} onClick={() => this.useForCyberVinci()}>
                            {nls.localize('theia/ai-providers/configuration/useForOpenCoder', 'Use for CyberVinci')}
                        </button>
                        <button className={`theia-button ${codicon('symbol-color')}`} onClick={() => this.useForOpenPencil()}>
                            {nls.localize('theia/ai-providers/configuration/useForOpenPencil', 'Use for OpenPencil')}
                        </button>
                        <button className={`theia-button ${codicon('settings-gear')}`} onClick={() => this.outputChannelManager.getChannel(CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL).show()}>
                            {nls.localizeByDefault('Show Output')}
                        </button>
                    </div>
                </div>

                <div className="ai-providers-status-grid">
                    {this.renderStatusTile(nls.localizeByDefault('Status'), statusLabel, available ? 'pass' : 'fail', status?.version)}
                    {this.renderStatusTile(
                        nls.localize('theia/ai-providers/configuration/runtime', 'Runtime'),
                        this.currentRuntimeLabel(),
                        available ? 'pass' : 'neutral',
                        status?.appServer ? nls.localizeByDefault('Running') : undefined
                    )}
                    {this.renderStatusTile(
                        nls.localize('theia/ai-providers/configuration/auth', 'Auth'),
                        status?.authenticated === undefined ? status?.authStatus || nls.localizeByDefault('Unknown') :
                            status.authenticated ? nls.localize('theia/ai-providers/configuration/authenticated', 'Authenticated') :
                                nls.localize('theia/ai-providers/configuration/notAuthenticated', 'Not authenticated'),
                        status?.authenticated ? 'pass' : status?.authenticated === false ? 'warn' : 'neutral',
                        status?.accountLabel
                    )}
                    {this.renderStatusTile(
                        nls.localizeByDefault('Model'),
                        status?.model || nls.localize('theia/ai-providers/configuration/providerDefault', 'Provider default'),
                        'neutral',
                        status?.models?.length ? nls.localize('theia/ai-providers/configuration/modelCount', '{0} available', status.models.length) : undefined
                    )}
                </div>

                <div className="ai-providers-mode-panel">
                    <div className="ai-providers-mode-header">
                        <span className="ai-providers-mode-title">{nls.localizeByDefault('Provider')}</span>
                        <span className="ai-providers-mode-current">{this.currentProviderLabel()}</span>
                    </div>
                    <div className="ai-providers-segmented">
                        {this.renderProviderButton('codex', codicon('terminal'), 'Codex CLI')}
                        {this.renderProviderButton('openrouter', codicon('cloud'), 'OpenRouter')}
                        {this.renderProviderButton('opencode-go', codicon('rocket'), 'OpenCode Go')}
                        {this.renderProviderButton('opencode', codicon('symbol-color'), 'OpenCode Zen')}
                        {this.renderProviderButton('gemini', codicon('star-full'), 'Gemini CLI')}
                        {this.renderProviderButton('claude-code', codicon('comment-discussion'), 'Claude Code')}
                        {this.renderProviderButton('cursor', codicon('edit'), 'Cursor CLI')}
                    </div>
                </div>

                {this.renderDetectedProviders()}

                <div className="ai-providers-mode-panel">
                    <div className="ai-providers-mode-header">
                        <span className="ai-providers-mode-title">{nls.localize('theia/ai-providers/configuration/runMode', 'Run Mode')}</span>
                        <span className="ai-providers-mode-current">{this.currentPresetLabel()}</span>
                    </div>
                    <div className="ai-providers-segmented">
                        {this.renderPresetButton('readOnly', codicon('eye'), nls.localize('theia/ai-providers/configuration/readOnlyPreset', 'Read Only'))}
                        {this.renderPresetButton('agent', codicon('tools'), nls.localizeByDefault('Agent Mode'))}
                        {this.renderPresetButton('fullAccess', codicon('shield'), nls.localize('theia/ai-providers/configuration/fullAccessPreset', 'Full Access'))}
                    </div>
                </div>

                <div className="ai-configuration-section">
                    <div className="settings-section-title settings-section-category-title">
                        {nls.localize('theia/ai-providers/configuration/title', 'CyberVinci AI Providers')}
                    </div>
                    <div className="ai-configuration-section-content">
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localizeByDefault('Status')}:</span>
                            <span className="ai-configuration-value-row-value">
                                <span className={available ? 'ai-model-status-ready' : 'ai-model-status-not-ready'}>
                                    {statusLabel}
                                </span>
                                {status?.version ? <span> {status.version}</span> : undefined}
                                {status?.message ? <span className="ai-configuration-warning-text"> {status.message}</span> : undefined}
                            </span>
                        </div>
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/ai-providers/configuration/runtimeService', 'Runtime Service')}:</span>
                            <span className="ai-configuration-value-row-value">
                                {this.isDirectRuntime()
                                    ? nls.localize('theia/ai-providers/configuration/directApi', 'Direct API')
                                    : status?.appServer === false
                                    ? nls.localize('theia/ai-providers/configuration/notRunning', 'Not running')
                                    : status?.appServer
                                    ? nls.localizeByDefault('Running')
                                    : nls.localizeByDefault('Unknown')}
                            </span>
                        </div>
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/ai-providers/configuration/auth', 'Auth')}:</span>
                            <span className="ai-configuration-value-row-value">
                                {status?.authenticated === undefined
                                    ? status?.authStatus || nls.localizeByDefault('Unknown')
                                    : status.authenticated
                                    ? nls.localize('theia/ai-providers/configuration/authenticated', 'Authenticated')
                                    : nls.localize('theia/ai-providers/configuration/notAuthenticated', 'Not authenticated')}
                                {status?.accountLabel ? <span> ({status.accountLabel})</span> : undefined}
                            </span>
                        </div>
                        {status?.models?.length ? (
                            <div className="ai-configuration-value-row">
                                <span className="ai-configuration-value-row-label">{nls.localizeByDefault('Models')}:</span>
                                <span className="ai-configuration-value-row-value">
                                    {status.models.slice(0, 12).join(', ')}{status.models.length > 12 ? ', ...' : ''}
                                </span>
                            </div>
                        ) : undefined}
                        {status?.configurationRequired?.length ? (
                            <div className="ai-configuration-value-row">
                                <span className="ai-configuration-value-row-label">{nls.localize('theia/ai-providers/configuration/required', 'Required')}:</span>
                                <span className="ai-configuration-value-row-value ai-configuration-warning-text">
                                    {status.configurationRequired.join(', ')}
                                </span>
                            </div>
                        ) : undefined}
                        {this.renderSelectPreference(CODEX_CLI_RUNTIME_PREF, nls.localize('theia/ai-providers/configuration/runtime', 'Runtime'), [
                            { value: 'codex-app-server', label: 'Codex CLI app-server' },
                            { value: 'direct-http', label: 'Direct API' },
                            { value: 'opencode-cli', label: 'OpenCode CLI' },
                            { value: 'gemini-cli', label: 'Gemini CLI' },
                            { value: 'claude-code-cli', label: 'Claude Code CLI' },
                            { value: 'cursor-cli', label: 'Cursor CLI' }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_MODEL_PROVIDER_PREF, nls.localizeByDefault('Provider'), [
                            { value: 'codex', label: 'Codex CLI' },
                            { value: 'openrouter', label: 'OpenRouter' },
                            { value: 'opencode-go', label: 'OpenCode Go' },
                            { value: 'opencode', label: 'OpenCode Zen' },
                            { value: 'gemini', label: 'Gemini CLI' },
                            { value: 'claude-code', label: 'Claude Code' },
                            { value: 'cursor', label: 'Cursor CLI' }
                        ])}
                        {this.renderRuntimeSpecificPreferences()}
                        {this.renderModelPreference()}
                        {this.renderSelectPreference(CODEX_CLI_SANDBOX_MODE_PREF, nls.localize('theia/ai-providers/configuration/sandbox', 'Sandbox'), [
                            { value: 'read-only', label: nls.localize('theia/ai-providers/configuration/readOnly', 'Read-Only') },
                            { value: 'workspace-write', label: nls.localize('theia/ai-providers/configuration/workspaceWrite', 'Workspace Write') },
                            { value: 'danger-full-access', label: nls.localize('theia/ai-providers/configuration/fullAccessPreset', 'Full Access') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_APPROVAL_POLICY_PREF, nls.localize('theia/ai-providers/configuration/approval', 'Approval'), [
                            { value: 'on-request', label: nls.localize('theia/ai-providers/configuration/onRequest', 'On Request') },
                            { value: 'on-failure', label: nls.localize('theia/ai-providers/configuration/onFailure', 'On Failure') },
                            { value: 'never', label: nls.localizeByDefault('Never') },
                            { value: 'untrusted', label: nls.localize('theia/ai-providers/configuration/untrusted', 'Untrusted') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_REASONING_EFFORT_PREF, nls.localize('theia/ai-providers/configuration/reasoning', 'Reasoning Effort'), [
                            { value: '', label: nls.localize('theia/ai-providers/configuration/chatSettingDefault', 'Chat setting/default') },
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') },
                            { value: 'xhigh', label: nls.localize('theia/ai-providers/configuration/extraHigh', 'Extra High') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_VERBOSITY_PREF, nls.localize('theia/ai-providers/configuration/verbosity', 'Verbosity'), [
                            { value: '', label: nls.localizeByDefault('Default') },
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_SERVICE_TIER_PREF, nls.localize('theia/ai-providers/configuration/serviceTier', 'Service Tier'), [
                            { value: '', label: nls.localizeByDefault('Default') },
                            { value: 'fast', label: nls.localize('theia/ai-providers/configuration/fast', 'Fast') },
                            { value: 'flex', label: nls.localize('theia/ai-providers/configuration/flex', 'Flex') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_WEB_SEARCH_PREF, nls.localizeByDefault('Web Search'), [
                            { value: 'disabled', label: nls.localizeByDefault('Disabled') },
                            { value: 'cached', label: nls.localize('theia/ai-providers/configuration/cached', 'Cached') },
                            { value: 'live', label: nls.localize('theia/ai-providers/configuration/live', 'Live') }
                        ])}
                        {this.renderSelectPreference(
                            CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
                            nls.localize('theia/ai-providers/configuration/webSearchContext', 'Web Search Context'),
                            [
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') }
                            ]
                        )}
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/ai-providers/configuration/actions', 'Actions')}:</span>
                            <span className="ai-configuration-value-row-value">
                                <button className={`theia-button ${codicon('refresh')}`} title={nls.localizeByDefault('Refresh')} onClick={() => this.refreshStatus()} />
                                <button className={`theia-button ${codicon('debug-restart')}`} onClick={() => this.restart()}>
                                    {nls.localizeByDefault('Restart')}
                                </button>
                                <button className={`theia-button ${codicon('account')}`} onClick={() => this.login()}>
                                    {this.isCliRuntime()
                                        ? nls.localize('theia/ai-providers/configuration/cliAuth', 'CLI Auth')
                                        : this.isDirectRuntime()
                                        ? nls.localize('theia/ai-providers/configuration/apiKey', 'API Key')
                                        : nls.localize('theia/ai-providers/configuration/signIn', 'Sign in with ChatGPT')}
                                </button>
                                <button className={`theia-button ${codicon('output')}`} onClick={() => this.outputChannelManager.getChannel(CYBERVINCI_AI_PROVIDERS_OUTPUT_CHANNEL).show()}>
                                    {nls.localizeByDefault('Show Output')}
                                </button>
                            </span>
                        </div>
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/ai-providers/configuration/presets', 'Presets')}:</span>
                            <span className="ai-configuration-value-row-value">
                                <button className={`theia-button ${codicon('eye')}`} onClick={() => this.applyPreset('readOnly')}>
                                    {nls.localize('theia/ai-providers/configuration/readOnlyPreset', 'Read Only')}
                                </button>
                                <button className={`theia-button ${codicon('tools')}`} onClick={() => this.applyPreset('agent')}>
                                    {nls.localizeByDefault('Agent Mode')}
                                </button>
                                <button className={`theia-button ${codicon('shield')}`} onClick={() => this.applyPreset('fullAccess')}>
                                    {nls.localize('theia/ai-providers/configuration/fullAccessPreset', 'Full Access')}
                                </button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    protected renderStatusTile(label: string, value: string, tone: 'pass' | 'warn' | 'fail' | 'neutral', detail?: string): React.ReactNode {
        return (
            <div className={`ai-providers-status-tile ${tone}`}>
                <div className="ai-providers-status-label">{label}</div>
                <div className="ai-providers-status-value">{value}</div>
                {detail ? <div className="ai-providers-status-detail">{detail}</div> : undefined}
            </div>
        );
    }

    protected renderPresetButton(preset: 'readOnly' | 'agent' | 'fullAccess', iconClass: string, label: string): React.ReactNode {
        const active = this.currentPreset() === preset;
        return (
            <button className={`ai-providers-segment ${active ? 'active' : ''}`} onClick={() => this.applyPreset(preset)}>
                <span className={iconClass} />
                <span>{label}</span>
            </button>
        );
    }

    protected renderProviderButton(preset: ProviderPreset, iconClass: string, label: string): React.ReactNode {
        const active = this.currentProviderPreset() === preset;
        const detected = this.detectedProviderFor(preset);
        const availabilityClass = detected?.available ? 'available' : detected?.cliAvailable ? 'needs-config' : detected ? 'missing' : 'unknown';
        return (
            <button
                className={`ai-providers-segment ${active ? 'active' : ''} ${availabilityClass}`}
                title={this.detectedProviderTitle(detected)}
                onClick={() => this.applyProviderPreset(preset)}
            >
                <span className={iconClass} />
                <span>{label}</span>
            </button>
        );
    }

    protected renderDetectedProviders(): React.ReactNode {
        const detected = this.status?.detectedProviders;
        if (!detected?.length) {
            return undefined;
        }
        return (
            <div className="ai-providers-mode-panel">
                <div className="ai-providers-mode-header">
                    <span className="ai-providers-mode-title">{nls.localize('theia/ai-providers/configuration/detectedProviders', 'Detected Providers')}</span>
                    <span className="ai-providers-mode-current">
                        {nls.localize('theia/ai-providers/configuration/detectedProviderCount', '{0} ready', detected.filter(provider => provider.available).length)}
                    </span>
                </div>
                <div className="ai-providers-detection-list">
                    {detected.map(provider => this.renderDetectedProvider(provider))}
                </div>
            </div>
        );
    }

    protected renderDetectedProvider(provider: CodexProviderDetectedProvider): React.ReactNode {
        const preset = this.presetForDetectedProvider(provider);
        const state = this.detectedProviderState(provider);
        return (
            <div key={`${provider.runtime}:${provider.modelProvider}`} className={`ai-providers-detection-row ${state}`}>
                <div className="ai-providers-detection-main">
                    <span className={provider.available ? codicon('check') : codicon('warning')} />
                    <span className="ai-providers-detection-label">{provider.label}</span>
                    <span className="ai-providers-detection-state">
                        {provider.available
                            ? nls.localize('theia/ai-providers/configuration/ready', 'Ready')
                            : provider.cliAvailable && provider.configured === false
                            ? nls.localize('theia/ai-providers/configuration/needsKey', 'Needs key')
                            : provider.cliAvailable
                            ? nls.localize('theia/ai-providers/configuration/needsAuth', 'Needs auth')
                            : nls.localize('theia/ai-providers/configuration/notFound', 'Not found')}
                    </span>
                </div>
                <div className="ai-providers-detection-detail">
                    {provider.available || provider.cliAvailable
                        ? `${provider.executablePath}${provider.version ? ` · ${provider.version}` : ''}`
                        : provider.message || provider.executablePath}
                    {!provider.available && provider.cliAvailable && provider.message ? <span> · {provider.message}</span> : undefined}
                </div>
                <div className="ai-providers-detection-actions">
                    <button className="theia-button secondary" onClick={() => this.applyProviderPreset(preset)}>
                        {provider.available
                            ? nls.localizeByDefault('Use')
                            : provider.cliAvailable && provider.configured === false
                            ? nls.localizeByDefault('Configure')
                            : provider.cliAvailable
                            ? nls.localizeByDefault('Configure')
                            : nls.localize('theia/ai-providers/configuration/configurePath', 'Configure Path')}
                    </button>
                </div>
            </div>
        );
    }

    protected detectedProviderState(provider: CodexProviderDetectedProvider): 'available' | 'needs-config' | 'missing' {
        if (provider.available) {
            return 'available';
        }
        return provider.cliAvailable ? 'needs-config' : 'missing';
    }

    protected detectedProviderTitle(provider: CodexProviderDetectedProvider | undefined): string | undefined {
        if (!provider) {
            return undefined;
        }
        if (provider.available || provider.cliAvailable) {
            return `${provider.executablePath}${provider.version ? ` ${provider.version}` : ''}${provider.message ? ` - ${provider.message}` : ''}`;
        }
        return provider.message;
    }

    protected detectedProviderFor(preset: ProviderPreset): CodexProviderDetectedProvider | undefined {
        const config = PROVIDER_PRESET_CONFIG[preset];
        return this.status?.detectedProviders?.find(provider =>
            provider.runtime === config.runtime && provider.modelProvider === config.provider
        );
    }

    protected presetForDetectedProvider(provider: CodexProviderDetectedProvider): ProviderPreset {
        const match = Object.entries(PROVIDER_PRESET_CONFIG).find(([, config]) =>
            config.runtime === provider.runtime && config.provider === provider.modelProvider
        );
        return (match?.[0] as ProviderPreset | undefined) ?? 'codex';
    }

    protected currentProviderPreset(): ProviderPreset {
        const runtime = this.currentRuntime();
        if (runtime === 'codex-app-server') {
            return 'codex';
        }
        if (runtime === 'gemini-cli') {
            return 'gemini';
        }
        if (runtime === 'claude-code-cli') {
            return 'claude-code';
        }
        if (runtime === 'cursor-cli') {
            return 'cursor';
        }
        if (runtime === 'direct-http') {
            const directProvider = this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, '') ||
                this.providerFromModel(this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, ''));
            if (directProvider === 'openrouter' || directProvider === 'opencode-go' || directProvider === 'opencode') {
                return directProvider;
            }
            return 'openrouter';
        }
        const provider = this.preferenceService.get<string>(CODEX_CLI_MODEL_PROVIDER_PREF, '') || this.providerFromModel(this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, ''));
        if (provider === 'openrouter' || provider === 'opencode-go' || provider === 'opencode') {
            return provider;
        }
        return 'opencode';
    }

    protected currentProviderLabel(): string {
        const provider = this.currentProviderPreset();
        if (provider === 'codex') {
            return 'Codex CLI';
        }
        if (provider === 'openrouter') {
            return 'OpenRouter';
        }
        if (provider === 'opencode-go') {
            return 'OpenCode Go';
        }
        if (provider === 'opencode') {
            return 'OpenCode Zen';
        }
        if (provider === 'gemini') {
            return 'Gemini CLI';
        }
        if (provider === 'claude-code') {
            return 'Claude Code';
        }
        return 'Cursor CLI';
    }

    protected currentRuntimeLabel(): string {
        const runtime = this.currentRuntime();
        if (runtime === 'direct-http') {
            return nls.localize('theia/ai-providers/configuration/directApi', 'Direct API');
        }
        if (runtime === 'opencode-cli') {
            return nls.localize('theia/ai-providers/configuration/openCodeCli', 'OpenCode CLI');
        }
        if (runtime === 'gemini-cli') {
            return nls.localize('theia/ai-providers/configuration/geminiCli', 'Gemini CLI');
        }
        if (runtime === 'claude-code-cli') {
            return nls.localize('theia/ai-providers/configuration/claudeCodeCli', 'Claude Code CLI');
        }
        if (runtime === 'cursor-cli') {
            return nls.localize('theia/ai-providers/configuration/cursorCli', 'Cursor CLI');
        }
        return nls.localize('theia/ai-providers/configuration/codexAppServer', 'Codex CLI app-server');
    }

    protected currentRuntime(): CodexProviderRuntime {
        return this.preferenceService.get<CodexProviderRuntime>(CODEX_CLI_RUNTIME_PREF, 'codex-app-server');
    }

    protected isOpenCodeRuntime(): boolean {
        return this.currentRuntime() === 'opencode-cli' || this.currentRuntime() === 'direct-http';
    }

    protected isDirectRuntime(): boolean {
        return this.currentRuntime() === 'direct-http';
    }

    protected isCliRuntime(): boolean {
        return this.currentRuntime() !== 'codex-app-server' && this.currentRuntime() !== 'direct-http';
    }

    protected providerFromModel(model: string | undefined): string | undefined {
        if (!model) {
            return undefined;
        }
        const [provider, ...modelId] = model.split('/');
        return provider && modelId.length > 0 ? provider : undefined;
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
        return preset !== 'codex';
    }

    protected currentPreset(): 'readOnly' | 'agent' | 'fullAccess' {
        const sandbox = this.preferenceService.get<string>(CODEX_CLI_SANDBOX_MODE_PREF, 'read-only');
        const approval = this.preferenceService.get<string>(CODEX_CLI_APPROVAL_POLICY_PREF, 'on-request');
        if (sandbox === 'danger-full-access') {
            return 'fullAccess';
        }
        if (sandbox === 'workspace-write' || approval !== 'never') {
            return 'agent';
        }
        return 'readOnly';
    }

    protected currentPresetLabel(): string {
        const preset = this.currentPreset();
        if (preset === 'fullAccess') {
            return nls.localize('theia/ai-providers/configuration/fullAccessPreset', 'Full Access');
        }
        if (preset === 'agent') {
            return nls.localizeByDefault('Agent Mode');
        }
        return nls.localize('theia/ai-providers/configuration/readOnlyPreset', 'Read Only');
    }

    protected renderRuntimeSpecificPreferences(): React.ReactNode {
        const runtime = this.currentRuntime();
        if (runtime === 'direct-http') {
            const provider = this.currentProviderPreset();
            if (provider === 'openrouter') {
                return this.renderSecretPreference(
                    CODEX_CLI_OPENROUTER_API_KEY_PREF,
                    nls.localize('theia/ai-providers/configuration/openRouterApiKey', 'OpenRouter API Key'),
                    'OPENROUTER_API_KEY'
                );
            }
            return this.renderSecretPreference(
                CODEX_CLI_OPENCODE_API_KEY_PREF,
                nls.localize('theia/ai-providers/configuration/openCodeApiKey', 'OpenCode API Key'),
                'OPENCODE_API_KEY'
            );
        }
        if (runtime === 'opencode-cli') {
            return (
                <React.Fragment>
                    {this.renderTextPreference(CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF, nls.localize('theia/ai-providers/configuration/openCodeExecutable', 'OpenCode Executable'), 'opencode')}
                    {this.renderTextPreference(CODEX_CLI_OPENCODE_AGENT_PREF, nls.localize('theia/ai-providers/configuration/openCodeAgent', 'OpenCode Agent'), nls.localizeByDefault('Default'))}
                    {this.renderTextPreference(CODEX_CLI_OPENCODE_VARIANT_PREF, nls.localize('theia/ai-providers/configuration/openCodeVariant', 'OpenCode Variant'), nls.localizeByDefault('Default'))}
                </React.Fragment>
            );
        }
        if (runtime === 'gemini-cli') {
            return this.renderTextPreference(CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF, nls.localize('theia/ai-providers/configuration/geminiExecutable', 'Gemini Executable'), 'gemini');
        }
        if (runtime === 'claude-code-cli') {
            return (
                <React.Fragment>
                    {this.renderTextPreference(CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF, nls.localize('theia/ai-providers/configuration/claudeExecutable', 'Claude Executable'), 'claude')}
                    {this.renderTextPreference(CODEX_CLI_CLAUDE_AGENT_PREF, nls.localize('theia/ai-providers/configuration/claudeAgent', 'Claude Agent'), nls.localizeByDefault('Default'))}
                </React.Fragment>
            );
        }
        if (runtime === 'cursor-cli') {
            return (
                <React.Fragment>
                    {this.renderTextPreference(CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF, nls.localize('theia/ai-providers/configuration/cursorExecutable', 'Cursor Executable'), 'cursor-agent')}
                    {this.renderSelectPreference(CODEX_CLI_CURSOR_MODE_PREF, nls.localize('theia/ai-providers/configuration/cursorMode', 'Cursor Mode'), [
                        { value: '', label: nls.localizeByDefault('Default') },
                        { value: 'plan', label: nls.localize('theia/ai-providers/configuration/cursorPlan', 'Plan') },
                        { value: 'ask', label: nls.localize('theia/ai-providers/configuration/cursorAsk', 'Ask') }
                    ])}
                </React.Fragment>
            );
        }
        return (
            <React.Fragment>
                {this.renderTextPreference(CODEX_CLI_EXECUTABLE_PATH_PREF, nls.localize('theia/ai-providers/configuration/executable', 'Codex Executable'), 'codex')}
                {this.renderTextPreference(CODEX_CLI_PROFILE_PREF, nls.localizeByDefault('Profile'), nls.localizeByDefault('Default'))}
            </React.Fragment>
        );
    }

    protected async pickCurrentModel(): Promise<void> {
        const status = this.status ?? await this.codexProvider.getStatus();
        const currentModel = this.preferenceService.get<string>(CODEX_CLI_MODEL_PREF, '');
        const models = Array.from(new Set([
            currentModel,
            ...(status.models ?? [])
        ].filter((model): model is string => !!model)));
        if (!models.length) {
            const input = await this.quickInputService.input({
                placeHolder: this.modelPlaceholder(),
                prompt: nls.localize('theia/ai-providers/configuration/modelPrompt', 'Model id')
            });
            if (input === undefined) {
                return;
            }
            await this.setPreference(CODEX_CLI_MODEL_PREF, input.trim());
            await this.refreshStatus();
            return;
        }
        const picked = await this.quickInputService.pick<CodexProviderModelPick>([
            {
                label: nls.localize('theia/ai-providers/configuration/providerDefault', 'Provider default'),
                description: this.modelPlaceholder(),
                value: ''
            },
            ...models.map(model => ({
                label: model,
                description: this.currentProviderLabel(),
                detail: model === currentModel ? nls.localizeByDefault('Current') : undefined,
                value: model
            })),
            {
                label: nls.localize('theia/ai-providers/configuration/customModel', 'Custom model'),
                description: nls.localize('theia/ai-providers/configuration/customModelDescription', 'Type a model id that is not listed'),
                custom: true,
                value: ''
            }
        ], {
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: nls.localize('theia/ai-providers/configuration/modelPickerPlaceholder', 'Choose model for {0}', this.currentProviderLabel())
        });
        if (!picked) {
            return;
        }
        let nextModel = picked.value;
        if (picked.custom) {
            const input = await this.quickInputService.input({
                placeHolder: this.modelPlaceholder(),
                prompt: nls.localize('theia/ai-providers/configuration/modelPrompt', 'Model id')
            });
            if (input === undefined) {
                return;
            }
            nextModel = input.trim();
        }
        await this.setPreference(CODEX_CLI_MODEL_PREF, nextModel?.trim());
        await this.refreshStatus();
    }

    protected modelPlaceholder(): string {
        if (this.isOpenCodeRuntime()) {
            return `${this.currentProviderPreset()}/model`;
        }
        if (this.isCliRuntime()) {
            return nls.localize('theia/ai-providers/configuration/nativeModelName', 'Native model name');
        }
        return nls.localize('theia/ai-providers/configuration/providerDefault', 'Provider default');
    }

    protected renderModelPreference(): React.ReactNode {
        const preferenceName = CODEX_CLI_MODEL_PREF;
        const models = this.status?.models ?? [];
        const listId = 'ai-providers-model-options';
        return (
            <div className="ai-configuration-value-row">
                <label className="ai-configuration-value-row-label" htmlFor={preferenceName}>{nls.localizeByDefault('Model')}:</label>
                <span className="ai-providers-model-input-cell">
                    <input
                        key={this.preferenceService.get<string>(preferenceName, '')}
                        id={preferenceName}
                        className="theia-input ai-configuration-value-row-value"
                        list={models.length ? listId : undefined}
                        defaultValue={this.preferenceService.get<string>(preferenceName, '')}
                        placeholder={this.modelPlaceholder()}
                        onBlur={event => this.setPreference(preferenceName, event.currentTarget.value.trim())}
                    />
                    <button
                        className={`theia-button secondary ${codicon('list-selection')}`}
                        title={nls.localize('theia/ai-providers/configuration/pickModel', 'Pick model')}
                        onClick={() => this.pickCurrentModel()}
                    />
                    {models.length ? (
                        <datalist id={listId}>
                            {models.map(model => <option key={model} value={model} />)}
                        </datalist>
                    ) : undefined}
                </span>
            </div>
        );
    }

    protected renderTextPreference(preferenceName: string, label: string, placeholder: string): React.ReactNode {
        return (
            <div className="ai-configuration-value-row">
                <label className="ai-configuration-value-row-label" htmlFor={preferenceName}>{label}:</label>
                <input
                    id={preferenceName}
                    className="theia-input ai-configuration-value-row-value"
                    defaultValue={this.preferenceService.get<string>(preferenceName, '')}
                    placeholder={placeholder}
                    onBlur={event => this.setPreference(preferenceName, event.currentTarget.value.trim())}
                />
            </div>
        );
    }

    protected renderSecretPreference(preferenceName: string, label: string, placeholder: string): React.ReactNode {
        return (
            <div className="ai-configuration-value-row">
                <label className="ai-configuration-value-row-label" htmlFor={preferenceName}>{label}:</label>
                <input
                    id={preferenceName}
                    className="theia-input ai-configuration-value-row-value"
                    type="password"
                    autoComplete="off"
                    defaultValue={this.preferenceService.get<string>(preferenceName, '')}
                    placeholder={placeholder}
                    onBlur={event => this.setPreference(preferenceName, event.currentTarget.value.trim())}
                />
            </div>
        );
    }

    protected renderSelectPreference<T extends string>(
        preferenceName: string,
        label: string,
        options: SelectOption<T & string>[]
    ): React.ReactNode {
        return (
            <div className="ai-configuration-value-row">
                <label className="ai-configuration-value-row-label" htmlFor={preferenceName}>{label}:</label>
                <select
                    id={preferenceName}
                    className="theia-select ai-configuration-value-row-value"
                    value={this.preferenceService.get<string>(preferenceName, '')}
                    onChange={event => this.setPreference(preferenceName, event.currentTarget.value)}
                >
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </div>
        );
    }
}

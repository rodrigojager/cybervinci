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
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { OutputChannelManager } from '@theia/output/lib/browser/output-channel';
import {
    CODEX_CLI_APPROVAL_POLICY_PREF,
    CODEX_CLI_EXECUTABLE_PATH_PREF,
    CODEX_CLI_MODEL_PREF,
    CODEX_CLI_PROFILE_PREF,
    CODEX_CLI_REASONING_EFFORT_PREF,
    CODEX_CLI_SANDBOX_MODE_PREF,
    CODEX_CLI_SERVICE_TIER_PREF,
    CODEX_CLI_VERBOSITY_PREF,
    CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
    CODEX_CLI_WEB_SEARCH_PREF
} from '../common/codex-provider-preferences';
import { CodexProviderOptions, CodexProviderStatus } from '../common/codex-provider-service';
import { CodexProviderFrontendService } from './codex-provider-frontend-service';
import { CODEX_CLI_LANGUAGE_MODEL_ID } from './codex-provider-language-model';

interface SelectOption<T extends string> {
    value: T | '';
    label: string;
}

interface CodexProviderLanguageModelRequirement {
    purpose: string;
    identifier: string;
}

@injectable()
export class CodexProviderConfigurationWidget extends ReactWidget {

    static readonly ID = 'codex-provider-configuration-widget';
    static readonly LABEL = nls.localize('theia/codex-provider/configuration/widgetLabel', 'Codex Provider');

    @inject(CodexProviderFrontendService)
    protected readonly codexProvider: CodexProviderFrontendService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(OutputChannelManager)
    protected readonly outputChannelManager: OutputChannelManager;

    protected status: CodexProviderStatus | undefined;

    @postConstruct()
    protected init(): void {
        this.id = CodexProviderConfigurationWidget.ID;
        this.title.label = CodexProviderConfigurationWidget.LABEL;
        this.title.closable = false;
        this.addClass('ai-configuration-widget');
        this.addClass('codex-provider-configuration-widget');
        this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName.startsWith('ai-features.codexProvider.') || event.preferenceName === AGENT_SETTINGS_PREF) {
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

    protected async setPreference(preferenceName: string, value: string | undefined): Promise<void> {
        await this.preferenceService.set(preferenceName, value || undefined, PreferenceScope.User);
    }

    protected render(): React.ReactNode {
        const status = this.status;
        const available = status?.available !== false;
        const statusLabel = available
            ? nls.localize('theia/codex-provider/configuration/ready', 'Ready')
            : nls.localize('theia/codex-provider/configuration/unavailable', 'Unavailable');
        return (
            <div className="ai-configuration-widget-content">
                <div className="codex-provider-provider-header">
                    <div>
                        <div className="codex-provider-provider-title">
                            <span className={codicon('hubot')} />
                            <span>{nls.localize('theia/codex-provider/configuration/cyberVinciProvider', 'CyberVinci Codex Provider')}</span>
                        </div>
                        <div className="codex-provider-provider-subtitle">
                            {nls.localize('theia/codex-provider/configuration/providerSubtitle',
                                'Local Codex Provider runtime for ChatGPT login, coding-agent tools, approvals, shell execution, and reviewable workspace changes.')}
                        </div>
                    </div>
                    <div className="codex-provider-provider-actions">
                        <button className={`theia-button ${codicon('plug')}`} onClick={() => this.useForCyberVinci()}>
                            {nls.localize('theia/codex-provider/configuration/useForOpenCoder', 'Use for CyberVinci')}
                        </button>
                        <button className={`theia-button ${codicon('symbol-color')}`} onClick={() => this.useForOpenPencil()}>
                            {nls.localize('theia/codex-provider/configuration/useForOpenPencil', 'Use for OpenPencil')}
                        </button>
                        <button className={`theia-button ${codicon('settings-gear')}`} onClick={() => this.outputChannelManager.getChannel('Codex Provider').show()}>
                            {nls.localizeByDefault('Show Output')}
                        </button>
                    </div>
                </div>

                <div className="codex-provider-status-grid">
                    {this.renderStatusTile(nls.localizeByDefault('Status'), statusLabel, available ? 'pass' : 'fail', status?.version)}
                    {this.renderStatusTile(
                        nls.localize('theia/codex-provider/configuration/appServer', 'App Server'),
                        status?.appServer === false ? nls.localize('theia/codex-provider/configuration/notRunning', 'Not running') :
                            status?.appServer ? nls.localizeByDefault('Running') : nls.localizeByDefault('Unknown'),
                        status?.appServer ? 'pass' : 'neutral'
                    )}
                    {this.renderStatusTile(
                        nls.localize('theia/codex-provider/configuration/auth', 'Auth'),
                        status?.authenticated === undefined ? status?.authStatus || nls.localizeByDefault('Unknown') :
                            status.authenticated ? nls.localize('theia/codex-provider/configuration/authenticated', 'Authenticated') :
                                nls.localize('theia/codex-provider/configuration/notAuthenticated', 'Not authenticated'),
                        status?.authenticated ? 'pass' : status?.authenticated === false ? 'warn' : 'neutral',
                        status?.accountLabel
                    )}
                    {this.renderStatusTile(
                        nls.localizeByDefault('Model'),
                        status?.model || nls.localize('theia/codex-provider/configuration/defaultModel', 'Codex Provider default'),
                        'neutral',
                        status?.models?.length ? nls.localize('theia/codex-provider/configuration/modelCount', '{0} available', status.models.length) : undefined
                    )}
                </div>

                <div className="codex-provider-mode-panel">
                    <div className="codex-provider-mode-header">
                        <span className="codex-provider-mode-title">{nls.localize('theia/codex-provider/configuration/runMode', 'Run Mode')}</span>
                        <span className="codex-provider-mode-current">{this.currentPresetLabel()}</span>
                    </div>
                    <div className="codex-provider-segmented">
                        {this.renderPresetButton('readOnly', codicon('eye'), nls.localize('theia/codex-provider/configuration/readOnlyPreset', 'Read Only'))}
                        {this.renderPresetButton('agent', codicon('tools'), nls.localizeByDefault('Agent Mode'))}
                        {this.renderPresetButton('fullAccess', codicon('shield'), nls.localize('theia/codex-provider/configuration/fullAccessPreset', 'Full Access'))}
                    </div>
                </div>

                <div className="ai-configuration-section">
                    <div className="settings-section-title settings-section-category-title">
                        {nls.localize('theia/codex-provider/configuration/title', 'Codex Provider')}
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
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/codex-provider/configuration/appServer', 'App Server')}:</span>
                            <span className="ai-configuration-value-row-value">
                                {status?.appServer === false
                                    ? nls.localize('theia/codex-provider/configuration/notRunning', 'Not running')
                                    : status?.appServer
                                    ? nls.localizeByDefault('Running')
                                    : nls.localizeByDefault('Unknown')}
                            </span>
                        </div>
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/codex-provider/configuration/auth', 'Auth')}:</span>
                            <span className="ai-configuration-value-row-value">
                                {status?.authenticated === undefined
                                    ? status?.authStatus || nls.localizeByDefault('Unknown')
                                    : status.authenticated
                                    ? nls.localize('theia/codex-provider/configuration/authenticated', 'Authenticated')
                                    : nls.localize('theia/codex-provider/configuration/notAuthenticated', 'Not authenticated')}
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
                                <span className="ai-configuration-value-row-label">{nls.localize('theia/codex-provider/configuration/required', 'Required')}:</span>
                                <span className="ai-configuration-value-row-value ai-configuration-warning-text">
                                    {status.configurationRequired.join(', ')}
                                </span>
                            </div>
                        ) : undefined}
                        {this.renderTextPreference(CODEX_CLI_EXECUTABLE_PATH_PREF, nls.localize('theia/codex-provider/configuration/executable', 'Executable'), 'codex')}
                        {this.renderTextPreference(CODEX_CLI_PROFILE_PREF, nls.localizeByDefault('Profile'), nls.localizeByDefault('Default'))}
                        {this.renderTextPreference(CODEX_CLI_MODEL_PREF, nls.localizeByDefault('Model'), nls.localize('theia/codex-provider/configuration/defaultModel', 'Codex Provider default'))}
                        {this.renderSelectPreference(CODEX_CLI_SANDBOX_MODE_PREF, nls.localize('theia/codex-provider/configuration/sandbox', 'Sandbox'), [
                            { value: 'read-only', label: nls.localize('theia/codex-provider/configuration/readOnly', 'Read-Only') },
                            { value: 'workspace-write', label: nls.localize('theia/codex-provider/configuration/workspaceWrite', 'Workspace Write') },
                            { value: 'danger-full-access', label: nls.localize('theia/codex-provider/configuration/fullAccessPreset', 'Full Access') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_APPROVAL_POLICY_PREF, nls.localize('theia/codex-provider/configuration/approval', 'Approval'), [
                            { value: 'on-request', label: nls.localize('theia/codex-provider/configuration/onRequest', 'On Request') },
                            { value: 'on-failure', label: nls.localize('theia/codex-provider/configuration/onFailure', 'On Failure') },
                            { value: 'never', label: nls.localizeByDefault('Never') },
                            { value: 'untrusted', label: nls.localize('theia/codex-provider/configuration/untrusted', 'Untrusted') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_REASONING_EFFORT_PREF, nls.localize('theia/codex-provider/configuration/reasoning', 'Reasoning Effort'), [
                            { value: '', label: nls.localize('theia/codex-provider/configuration/chatSettingDefault', 'Chat setting/default') },
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') },
                            { value: 'xhigh', label: nls.localize('theia/codex-provider/configuration/extraHigh', 'Extra High') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_VERBOSITY_PREF, nls.localize('theia/codex-provider/configuration/verbosity', 'Verbosity'), [
                            { value: '', label: nls.localizeByDefault('Default') },
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_SERVICE_TIER_PREF, nls.localize('theia/codex-provider/configuration/serviceTier', 'Service Tier'), [
                            { value: '', label: nls.localizeByDefault('Default') },
                            { value: 'fast', label: nls.localize('theia/codex-provider/configuration/fast', 'Fast') },
                            { value: 'flex', label: nls.localize('theia/codex-provider/configuration/flex', 'Flex') }
                        ])}
                        {this.renderSelectPreference(CODEX_CLI_WEB_SEARCH_PREF, nls.localizeByDefault('Web Search'), [
                            { value: 'disabled', label: nls.localizeByDefault('Disabled') },
                            { value: 'cached', label: nls.localize('theia/codex-provider/configuration/cached', 'Cached') },
                            { value: 'live', label: nls.localize('theia/codex-provider/configuration/live', 'Live') }
                        ])}
                        {this.renderSelectPreference(
                            CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF,
                            nls.localize('theia/codex-provider/configuration/webSearchContext', 'Web Search Context'),
                            [
                            { value: 'low', label: nls.localizeByDefault('Low') },
                            { value: 'medium', label: nls.localizeByDefault('Medium') },
                            { value: 'high', label: nls.localizeByDefault('High') }
                            ]
                        )}
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/codex-provider/configuration/actions', 'Actions')}:</span>
                            <span className="ai-configuration-value-row-value">
                                <button className={`theia-button ${codicon('refresh')}`} title={nls.localizeByDefault('Refresh')} onClick={() => this.refreshStatus()} />
                                <button className={`theia-button ${codicon('debug-restart')}`} onClick={() => this.restart()}>
                                    {nls.localizeByDefault('Restart')}
                                </button>
                                <button className={`theia-button ${codicon('account')}`} onClick={() => this.login()}>
                                    {nls.localize('theia/codex-provider/configuration/signIn', 'Sign in with ChatGPT')}
                                </button>
                                <button className={`theia-button ${codicon('output')}`} onClick={() => this.outputChannelManager.getChannel('Codex Provider').show()}>
                                    {nls.localizeByDefault('Show Output')}
                                </button>
                            </span>
                        </div>
                        <div className="ai-configuration-value-row">
                            <span className="ai-configuration-value-row-label">{nls.localize('theia/codex-provider/configuration/presets', 'Presets')}:</span>
                            <span className="ai-configuration-value-row-value">
                                <button className={`theia-button ${codicon('eye')}`} onClick={() => this.applyPreset('readOnly')}>
                                    {nls.localize('theia/codex-provider/configuration/readOnlyPreset', 'Read Only')}
                                </button>
                                <button className={`theia-button ${codicon('tools')}`} onClick={() => this.applyPreset('agent')}>
                                    {nls.localizeByDefault('Agent Mode')}
                                </button>
                                <button className={`theia-button ${codicon('shield')}`} onClick={() => this.applyPreset('fullAccess')}>
                                    {nls.localize('theia/codex-provider/configuration/fullAccessPreset', 'Full Access')}
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
            <div className={`codex-provider-status-tile ${tone}`}>
                <div className="codex-provider-status-label">{label}</div>
                <div className="codex-provider-status-value">{value}</div>
                {detail ? <div className="codex-provider-status-detail">{detail}</div> : undefined}
            </div>
        );
    }

    protected renderPresetButton(preset: 'readOnly' | 'agent' | 'fullAccess', iconClass: string, label: string): React.ReactNode {
        const active = this.currentPreset() === preset;
        return (
            <button className={`codex-provider-segment ${active ? 'active' : ''}`} onClick={() => this.applyPreset(preset)}>
                <span className={iconClass} />
                <span>{label}</span>
            </button>
        );
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
            return nls.localize('theia/codex-provider/configuration/fullAccessPreset', 'Full Access');
        }
        if (preset === 'agent') {
            return nls.localizeByDefault('Agent Mode');
        }
        return nls.localize('theia/codex-provider/configuration/readOnlyPreset', 'Read Only');
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

    protected renderSelectPreference<T extends NonNullable<CodexProviderOptions[keyof CodexProviderOptions]>>(
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

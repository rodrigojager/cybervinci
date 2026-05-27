// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { codicon, Message, ReactWidget } from '@theia/core/lib/browser';
import { CommandRegistry, MessageService, nls } from '@theia/core/lib/common';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { ChatService } from '@theia/ai-chat';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import {
    OUTPUT_CLEANER_CODEX_ENABLED_PREF,
    OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF,
    OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF,
    OUTPUT_CLEANER_ENABLED_PREF,
    OUTPUT_CLEANER_MODE_PREF,
    OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF,
    OUTPUT_CLEANER_SHOW_NOTICE_PREF,
    OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF,
    OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF,
    OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF
} from '../common/ai-output-cleaner-preferences';
import {
    OUTPUT_CLEANER_DISABLE_COMMAND,
    OUTPUT_CLEANER_EMERGENCY_DISABLE_COMMAND,
    OUTPUT_CLEANER_ENABLE_COMMAND,
    OUTPUT_CLEANER_INSTALL_CODEX_HOOKS_COMMAND,
    OUTPUT_CLEANER_OPEN_ARTIFACTS_COMMAND,
    OUTPUT_CLEANER_RECREATE_WRAPPERS_COMMAND,
    OUTPUT_CLEANER_REMOVE_CODEX_HOOKS_COMMAND,
    OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND,
    OUTPUT_CLEANER_TOGGLE_SESSION_BYPASS_COMMAND
} from '../common/ai-output-cleaner-commands';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { AIOutputCleanerProcessStatus, AIOutputCleanerStatusSnapshot, SavedArtifact } from '../common/ai-output-cleaner-types';

interface AIOutputCleanerStatusWidgetState {
    loading: boolean;
    errorMessage?: string;
    snapshot?: AIOutputCleanerStatusSnapshot;
    activeSessionId?: string;
    sessionBypass?: boolean;
    preferences: {
        enabled: boolean;
        mode: string;
        codex: boolean;
        wrappers: boolean;
        hooks: boolean;
        theiaTools: boolean;
        rawArtifacts: boolean;
        statusAware: boolean;
        showNotice: boolean;
        wrapperCommands: string[];
    };
    pendingCommand?: string;
}

@injectable()
export class AIOutputCleanerStatusWidget extends ReactWidget {
    static readonly ID = 'ai-output-cleaner-status-widget';
    static readonly LABEL = nls.localize('theia/cybervinci/aiOutputCleaner/statusWidget/label', 'AI Output Cleaner');

    @inject(AIOutputCleanerBackendService)
    protected readonly backendService: AIOutputCleanerBackendService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected refreshTimer?: number;

    protected state: AIOutputCleanerStatusWidgetState = {
        loading: true,
        preferences: {
            enabled: false,
            mode: 'off',
            codex: false,
            wrappers: false,
            hooks: false,
            theiaTools: false,
            rawArtifacts: false,
            statusAware: false,
            showNotice: false,
            wrapperCommands: []
        }
    };

    constructor() {
        super();
        this.id = AIOutputCleanerStatusWidget.ID;
        this.title.label = AIOutputCleanerStatusWidget.LABEL;
        this.title.caption = AIOutputCleanerStatusWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = codicon('pulse');
    }

    @postConstruct()
    protected init(): void {
        this.addClass('ai-output-cleaner-status-widget');
        void this.refresh();
    }

    override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.refreshTimer = window.setInterval(() => void this.refresh(), 5000);
    }

    override onBeforeDetach(msg: Message): void {
        super.onBeforeDetach(msg);
        if (this.refreshTimer !== undefined) {
            window.clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }

    override dispose(): void {
        if (this.refreshTimer !== undefined) {
            window.clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        super.dispose();
    }

    async refresh(): Promise<void> {
        this.state = {
            ...this.state,
            loading: true,
            errorMessage: undefined
        };
        this.update();
        try {
            const activeSessionId = this.chatService.getActiveSession()?.id;
            const preferences = this.readPreferences();
            const [snapshot, sessionOverride] = await Promise.all([
                this.backendService.getStatus({ limit: 12 }),
                activeSessionId ? this.backendService.getSessionOverride(activeSessionId) : Promise.resolve(undefined)
            ]);
            this.state = {
                ...this.state,
                loading: false,
                snapshot,
                activeSessionId,
                sessionBypass: sessionOverride?.bypassFiltering,
                preferences
            };
        } catch (error) {
            this.state = {
                ...this.state,
                loading: false,
                errorMessage: error instanceof Error ? error.message : String(error),
                preferences: this.readPreferences()
            };
        }
        this.update();
    }

    protected readPreferences(): AIOutputCleanerStatusWidgetState['preferences'] {
        return {
            enabled: this.preferenceService.get<boolean>(OUTPUT_CLEANER_ENABLED_PREF, false),
            mode: this.preferenceService.get<string>(OUTPUT_CLEANER_MODE_PREF, 'off'),
            codex: this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_ENABLED_PREF, false),
            wrappers: this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF, false),
            hooks: this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF, false),
            theiaTools: this.preferenceService.get<boolean>(OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF, false),
            rawArtifacts: this.preferenceService.get<boolean>(OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF, false),
            statusAware: this.preferenceService.get<boolean>(OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF, false),
            showNotice: this.preferenceService.get<boolean>(OUTPUT_CLEANER_SHOW_NOTICE_PREF, false),
            wrapperCommands: this.preferenceService.get<string[]>(OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF, [])
        };
    }

    protected override render(): React.ReactNode {
        return (
            <div style={styles.root}>
                {this.renderToolbar()}
                {this.state.loading && <div style={styles.banner}>Loading AI Output Cleaner status...</div>}
                {this.state.errorMessage && <div style={{ ...styles.banner, ...styles.errorBanner }}>
                    {this.state.errorMessage}
                </div>}
                {this.renderOverview()}
                {this.renderHooks()}
                {this.renderProcesses()}
                {this.renderArtifacts()}
            </div>
        );
    }

    protected renderToolbar(): React.ReactNode {
        return (
            <div style={styles.toolbar}>
                {this.renderToolbarButton(codicon('refresh'), 'Refresh', () => this.refresh())}
                {this.renderToolbarButton(codicon('play'), 'Enable cleaner', () => this.runCommand(OUTPUT_CLEANER_ENABLE_COMMAND.id))}
                {this.renderToolbarButton(codicon('stop-circle'), 'Disable cleaner', () => this.runCommand(OUTPUT_CLEANER_DISABLE_COMMAND.id))}
                {this.renderToolbarButton(codicon('warning'), 'Emergency disable', () => this.runCommand(OUTPUT_CLEANER_EMERGENCY_DISABLE_COMMAND.id))}
                {this.renderToolbarButton(codicon('folder-opened'), 'Open artifacts', () => this.runCommand(OUTPUT_CLEANER_OPEN_ARTIFACTS_COMMAND.id))}
                {this.renderToolbarButton(codicon('sync'), 'Recreate wrappers', () => this.runCommand(OUTPUT_CLEANER_RECREATE_WRAPPERS_COMMAND.id))}
            </div>
        );
    }

    protected renderToolbarButton(iconClass: string, title: string, onClick: () => void): React.ReactNode {
        return (
            <button
                className='theia-button'
                title={title}
                onClick={onClick}
                disabled={Boolean(this.state.pendingCommand)}
                style={styles.toolbarButton}
            >
                <i className={iconClass} />
            </button>
        );
    }

    protected renderOverview(): React.ReactNode {
        const snapshot = this.state.snapshot;
        const preferences = this.state.preferences;
        const summary = snapshot ? this.summarizeProcesses(snapshot) : undefined;
        return (
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.heading}>Overview</h3>
                    <div style={styles.meta}>
                        {snapshot?.updatedAt ? `Updated ${this.formatDate(snapshot.updatedAt)}` : 'Waiting for first snapshot'}
                    </div>
                </div>
                <div style={styles.grid}>
                    {this.renderMetric('Cleaner', preferences.enabled ? 'ON' : 'OFF', preferences.mode)}
                    {this.renderMetric('Codex', preferences.codex ? 'ON' : 'OFF', `Wrappers ${preferences.wrappers ? 'ON' : 'OFF'} / Hooks ${preferences.hooks ? 'ON' : 'OFF'}`)}
                    {this.renderMetric('Theia Tools', preferences.theiaTools ? 'ON' : 'OFF', preferences.statusAware ? 'Status-aware ON' : 'Status-aware OFF')}
                    {this.renderMetric('Artifacts', snapshot?.recentArtifacts.length?.toString() ?? '0', snapshot?.artifactRootPath ?? 'No artifact root')}
                </div>
                <div style={styles.keyValueList}>
                    {this.renderKeyValue('Wrapper commands', preferences.wrapperCommands.join(', ') || 'none')}
                    {this.renderKeyValue('Raw artifacts', preferences.rawArtifacts ? 'enabled' : 'disabled')}
                    {this.renderKeyValue('Filtering notices', preferences.showNotice ? 'enabled' : 'disabled')}
                    {this.renderKeyValue('Active chat', this.state.activeSessionId ?? 'none')}
                    {this.renderKeyValue('Chat bypass', this.state.activeSessionId ? (this.state.sessionBypass ? 'enabled' : 'disabled') : 'no active chat')}
                    {summary && this.renderKeyValue(
                        'Processes',
                        `${summary.total} tracked, ${summary.running} running, ${summary.failed} failed, ${summary.changed} changed`
                    )}
                    {summary && this.renderKeyValue('Recent filters', snapshot?.recentFiltersApplied.join(', ') || 'none')}
                </div>
                <div style={styles.actionRow}>
                    {this.renderActionButton('Toggle chat bypass', OUTPUT_CLEANER_TOGGLE_SESSION_BYPASS_COMMAND.id, !this.state.activeSessionId)}
                    {this.renderActionButton('Send latest raw output', OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND.id, !this.state.activeSessionId)}
                    {this.renderActionButton('Install hooks', OUTPUT_CLEANER_INSTALL_CODEX_HOOKS_COMMAND.id)}
                    {this.renderActionButton('Remove hooks', OUTPUT_CLEANER_REMOVE_CODEX_HOOKS_COMMAND.id)}
                </div>
            </section>
        );
    }

    protected renderHooks(): React.ReactNode {
        const hooks = this.state.snapshot?.codexHooks;
        return (
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.heading}>Codex Hooks</h3>
                    <div style={styles.meta}>{hooks?.readiness ?? 'unknown'}</div>
                </div>
                {!hooks && <div style={styles.emptyState}>No Codex hook snapshot available yet.</div>}
                {hooks && <>
                    <div style={styles.keyValueList}>
                        {this.renderKeyValue('Support', hooks.available ? (hooks.supported ? 'supported' : 'detected, unknown support') : 'codex unavailable')}
                        {this.renderKeyValue('Configured', hooks.configured ? 'yes' : 'no')}
                        {this.renderKeyValue('Runtime enabled', hooks.artifacts.runtimeEnabled ? 'yes' : 'no')}
                        {this.renderKeyValue('Prepared', hooks.artifacts.prepared ? 'yes' : 'no')}
                        {this.renderKeyValue('Event count', hooks.artifacts.eventCount.toString())}
                        {this.renderKeyValue('Config path', hooks.capability.configPath)}
                        {this.renderKeyValue('Helper path', hooks.artifacts.helperScriptPath)}
                        {this.renderKeyValue('Runtime state', hooks.artifacts.runtimeStatePath)}
                    </div>
                    <div style={styles.paragraph}>{hooks.summary}</div>
                    <div style={styles.monoBlock}>
                        Evidence: {hooks.capability.evidence.join('; ') || 'none'}
                        {'\n'}
                        Events: {hooks.artifacts.installedEvents.join(', ') || 'none'}
                    </div>
                </>}
            </section>
        );
    }

    protected renderProcesses(): React.ReactNode {
        const snapshot = this.state.snapshot;
        return (
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.heading}>Processes</h3>
                    <div style={styles.meta}>
                        {snapshot ? `${snapshot.activeProcesses.length} active / ${snapshot.recentProcesses.length} recent` : 'No snapshot'}
                    </div>
                </div>
                {snapshot?.activeProcesses.length ? snapshot.activeProcesses.map(process => this.renderProcess(process, true)) : (
                    <div style={styles.emptyState}>No active tracked processes.</div>
                )}
                {snapshot?.recentProcesses.length ? <>
                    <div style={styles.subheading}>Recent</div>
                    {snapshot.recentProcesses.slice(0, 8).map(process => this.renderProcess(process, false))}
                </> : undefined}
            </section>
        );
    }

    protected renderProcess(process: AIOutputCleanerProcessStatus, active: boolean): React.ReactNode {
        const statusColor = process.status === 'failed'
            ? '#c2410c'
            : process.status === 'running'
                ? '#2563eb'
                : '#15803d';
        return (
            <div key={`${active ? 'active' : 'recent'}-${process.id}`} style={styles.listCard}>
                <div style={styles.listHeader}>
                    <div style={styles.titleRow}>
                        <strong>{process.command}</strong>
                        <span style={{ ...styles.badge, borderColor: statusColor, color: statusColor }}>{process.status}</span>
                        {process.changed && <span style={styles.badge}>filtered</span>}
                    </div>
                    <div style={styles.meta}>{this.formatDate(process.lastUpdatedAt)}</div>
                </div>
                <div style={styles.keyValueList}>
                    {this.renderKeyValue('Args', process.args.join(' ') || 'none')}
                    {this.renderKeyValue('Origin', process.origin)}
                    {this.renderKeyValue('Session', process.sessionId ?? 'none')}
                    {this.renderKeyValue('PID', process.pid?.toString() ?? 'n/a')}
                    {this.renderKeyValue('Exit code', process.exitCode?.toString() ?? 'n/a')}
                    {this.renderKeyValue('Filters', process.filtersApplied.join(', ') || 'none')}
                    {this.renderKeyValue('Artifact', process.artifactId ?? 'none')}
                    {this.renderKeyValue('Updated', this.formatRelative(process.lastUpdatedAt))}
                </div>
                {process.notice && <div style={styles.paragraph}>{process.notice}</div>}
                {(process.lastStdoutPreview || process.lastStderrPreview || process.recentLines.length > 0) && <div style={styles.monoBlock}>
                    {process.lastStdoutPreview ? `stdout: ${process.lastStdoutPreview}\n` : ''}
                    {process.lastStderrPreview ? `stderr: ${process.lastStderrPreview}\n` : ''}
                    {process.recentLines.length > 0 ? `recent: ${process.recentLines.join(' | ')}` : ''}
                </div>}
            </div>
        );
    }

    protected renderArtifacts(): React.ReactNode {
        const recentArtifacts = this.state.snapshot?.recentArtifacts ?? [];
        return (
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.heading}>Artifacts</h3>
                    <div style={styles.meta}>{recentArtifacts.length} recent</div>
                </div>
                {recentArtifacts.length === 0 && <div style={styles.emptyState}>No artifacts captured yet.</div>}
                {recentArtifacts.map(artifact => this.renderArtifact(artifact))}
            </section>
        );
    }

    protected renderArtifact(artifact: SavedArtifact): React.ReactNode {
        return (
            <div key={artifact.id} style={styles.listCard}>
                <div style={styles.listHeader}>
                    <div style={styles.titleRow}>
                        <strong>{artifact.command}</strong>
                        <span style={styles.badge}>{artifact.id}</span>
                    </div>
                    <div style={styles.meta}>{this.formatDate(artifact.completedAt)}</div>
                </div>
                <div style={styles.keyValueList}>
                    {this.renderKeyValue('Args', artifact.args.join(' ') || 'none')}
                    {this.renderKeyValue('Origin', artifact.origin ?? 'unknown')}
                    {this.renderKeyValue('Session', artifact.sessionId ?? 'none')}
                    {this.renderKeyValue('Filters', artifact.filtersApplied.join(', ') || 'none')}
                    {this.renderKeyValue('Path', artifact.path)}
                </div>
                <div style={styles.actionRow}>
                    {this.renderActionButton('Send raw output', OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND.id, !this.state.activeSessionId, artifact.id)}
                </div>
            </div>
        );
    }

    protected renderMetric(label: string, value: string, detail: string): React.ReactNode {
        return (
            <div style={styles.metricCard}>
                <div style={styles.metricLabel}>{label}</div>
                <div style={styles.metricValue}>{value}</div>
                <div style={styles.metricDetail}>{detail}</div>
            </div>
        );
    }

    protected renderKeyValue(label: string, value: string): React.ReactNode {
        return (
            <div style={styles.keyValue} key={`${label}-${value}`}>
                <strong>{label}:</strong> <span style={styles.keyValueText}>{value}</span>
            </div>
        );
    }

    protected renderActionButton(label: string, commandId: string, disabled = false, ...args: unknown[]): React.ReactNode {
        return (
            <button
                className='theia-button'
                onClick={() => this.runCommand(commandId, ...args)}
                disabled={disabled || Boolean(this.state.pendingCommand)}
                style={styles.actionButton}
            >
                {label}
            </button>
        );
    }

    protected async runCommand(commandId: string, ...args: unknown[]): Promise<void> {
        this.state = {
            ...this.state,
            pendingCommand: commandId
        };
        this.update();
        try {
            await this.commandRegistry.executeCommand(commandId, ...args);
        } catch (error) {
            this.messageService.error(error instanceof Error ? error.message : String(error));
        } finally {
            this.state = {
                ...this.state,
                pendingCommand: undefined
            };
            await this.refresh();
        }
    }

    protected summarizeProcesses(status: AIOutputCleanerStatusSnapshot): {
        total: number;
        running: number;
        failed: number;
        changed: number;
    } {
        return {
            total: status.recentProcesses.length,
            running: status.recentProcesses.filter(process => process.status === 'running').length,
            failed: status.recentProcesses.filter(process => process.status === 'failed').length,
            changed: status.recentProcesses.filter(process => process.changed).length
        };
    }

    protected formatDate(value?: string): string {
        if (!value) {
            return 'n/a';
        }
        return new Date(value).toLocaleString();
    }

    protected formatRelative(value?: string): string {
        if (!value) {
            return 'n/a';
        }
        const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) {
            return `${seconds}s ago`;
        }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        overflowY: 'auto',
        color: 'var(--theia-foreground)'
    },
    toolbar: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    toolbarButton: {
        minWidth: '40px'
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        border: '1px solid var(--theia-panel-border)',
        borderRadius: '10px',
        background: 'var(--theia-editorWidget-background)'
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        alignItems: 'baseline'
    },
    heading: {
        margin: 0,
        fontSize: '14px'
    },
    subheading: {
        fontSize: '12px',
        fontWeight: 600,
        opacity: 0.8,
        marginTop: '4px'
    },
    meta: {
        fontSize: '11px',
        opacity: 0.75
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '8px'
    },
    metricCard: {
        padding: '10px',
        borderRadius: '8px',
        background: 'var(--theia-input-background)',
        border: '1px solid var(--theia-panel-border)'
    },
    metricLabel: {
        fontSize: '11px',
        opacity: 0.75,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
    },
    metricValue: {
        fontSize: '20px',
        fontWeight: 700,
        marginTop: '4px'
    },
    metricDetail: {
        fontSize: '11px',
        marginTop: '4px',
        wordBreak: 'break-word'
    },
    keyValueList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    keyValue: {
        fontSize: '12px',
        lineHeight: 1.5
    },
    keyValueText: {
        wordBreak: 'break-word'
    },
    actionRow: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    actionButton: {
        whiteSpace: 'nowrap'
    },
    listCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px',
        borderRadius: '8px',
        background: 'var(--theia-input-background)',
        border: '1px solid var(--theia-panel-border)'
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        alignItems: 'baseline'
    },
    titleRow: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px'
    },
    badge: {
        padding: '2px 6px',
        border: '1px solid var(--theia-panel-border)',
        borderRadius: '999px',
        fontSize: '10px',
        textTransform: 'uppercase'
    },
    emptyState: {
        fontSize: '12px',
        opacity: 0.75
    },
    paragraph: {
        fontSize: '12px',
        lineHeight: 1.5
    },
    monoBlock: {
        fontFamily: 'var(--theia-ui-font-family)',
        fontSize: '11px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: '8px',
        borderRadius: '6px',
        background: 'var(--theia-editor-background)'
    },
    banner: {
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'var(--theia-input-background)',
        border: '1px solid var(--theia-panel-border)',
        fontSize: '12px'
    },
    errorBanner: {
        color: '#b91c1c',
        borderColor: '#b91c1c33'
    }
};

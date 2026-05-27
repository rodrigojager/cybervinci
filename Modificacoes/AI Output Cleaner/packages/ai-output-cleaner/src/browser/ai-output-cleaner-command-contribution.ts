// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceScope, nls } from '@theia/core';
import { CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import { ApplicationShell, open, OpenerService, WidgetManager } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { ChatService, ChatSession } from '@theia/ai-chat';
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
import { PreferenceService } from '@theia/core/lib/common/preferences';
import {
    OUTPUT_CLEANER_OPEN_ARTIFACTS_COMMAND,
    OUTPUT_CLEANER_EMERGENCY_DISABLE_COMMAND,
    OUTPUT_CLEANER_DISABLE_COMMAND,
    OUTPUT_CLEANER_ENABLE_COMMAND,
    OUTPUT_CLEANER_INSTALL_CODEX_HOOKS_COMMAND,
    OUTPUT_CLEANER_RECREATE_WRAPPERS_COMMAND,
    OUTPUT_CLEANER_REMOVE_CODEX_HOOKS_COMMAND,
    OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND,
    OUTPUT_CLEANER_SHOW_STATUS_COMMAND,
    OUTPUT_CLEANER_TOGGLE_SESSION_BYPASS_COMMAND
} from '../common/ai-output-cleaner-commands';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { AIOutputCleanerProcessStatus, AIOutputCleanerRawArtifact, AIOutputCleanerStatusSnapshot } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerStatusWidget } from './ai-output-cleaner-status-widget';

@injectable()
export class AIOutputCleanerCommandContribution implements CommandContribution {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(AIOutputCleanerBackendService)
    protected readonly backendService: AIOutputCleanerBackendService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly applicationShell: ApplicationShell;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(OUTPUT_CLEANER_ENABLE_COMMAND, {
            execute: () => this.enable()
        });
        registry.registerCommand(OUTPUT_CLEANER_DISABLE_COMMAND, {
            execute: () => this.disable()
        });
        registry.registerCommand(OUTPUT_CLEANER_EMERGENCY_DISABLE_COMMAND, {
            execute: () => this.emergencyDisable()
        });
        registry.registerCommand(OUTPUT_CLEANER_SHOW_STATUS_COMMAND, {
            execute: () => this.showStatus()
        });
        registry.registerCommand(OUTPUT_CLEANER_OPEN_ARTIFACTS_COMMAND, {
            execute: () => this.openArtifactsFolder()
        });
        registry.registerCommand(OUTPUT_CLEANER_RECREATE_WRAPPERS_COMMAND, {
            execute: () => this.recreateWrappers()
        });
        registry.registerCommand(OUTPUT_CLEANER_INSTALL_CODEX_HOOKS_COMMAND, {
            execute: () => this.installCodexHooks()
        });
        registry.registerCommand(OUTPUT_CLEANER_REMOVE_CODEX_HOOKS_COMMAND, {
            execute: () => this.removeCodexHooks()
        });
        registry.registerCommand(OUTPUT_CLEANER_TOGGLE_SESSION_BYPASS_COMMAND, {
            execute: () => this.toggleSessionBypass()
        });
        registry.registerCommand(OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND, {
            execute: (artifactId?: string) => this.sendRawOutputToAgent(artifactId)
        });
    }

    protected async enable(): Promise<void> {
        await Promise.all([
            this.preferenceService.set(OUTPUT_CLEANER_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_MODE_PREF, 'safe', PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF, true, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_SHOW_NOTICE_PREF, true, PreferenceScope.User)
        ]);
        if (this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF, false)) {
            await this.backendService.setCodexHooksRuntimeEnabled(true);
        }
        this.messageService.info(nls.localize('theia/cybervinci/aiOutputCleaner/enabled', 'AI Output Cleaner enabled.'));
    }

    protected async disable(): Promise<void> {
        await Promise.all([
            this.preferenceService.set(OUTPUT_CLEANER_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_MODE_PREF, 'off', PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF, false, PreferenceScope.User)
        ]);
        await this.backendService.setCodexHooksRuntimeEnabled(false);
        this.messageService.info(nls.localize('theia/cybervinci/aiOutputCleaner/disabled', 'AI Output Cleaner disabled.'));
    }

    protected async emergencyDisable(): Promise<void> {
        await Promise.all([
            this.preferenceService.set(OUTPUT_CLEANER_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_MODE_PREF, 'off', PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF, false, PreferenceScope.User),
            this.preferenceService.set(OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF, false, PreferenceScope.User)
        ]);
        await this.backendService.setCodexHooksRuntimeEnabled(false);
        this.messageService.error(
            nls.localize('theia/cybervinci/aiOutputCleaner/emergencyDisabled',
                'AI Output Cleaner emergency-disabled. Filters, wrappers, future hook interception and process overrides are disabled for new sessions.')
        );
    }

    protected async showStatus(): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(AIOutputCleanerStatusWidget.ID) as AIOutputCleanerStatusWidget;
        if (!widget.isAttached) {
            this.applicationShell.addWidget(widget, {
                area: 'right',
                rank: 550
            });
        }
        this.applicationShell.activateWidget(widget.id);
        await widget.refresh();
    }

    protected buildStatusMessage(context: {
        enabled: boolean;
        mode: string;
        codex: boolean;
        wrappers: boolean;
        hooks: boolean;
        theiaTools: boolean;
        status: AIOutputCleanerStatusSnapshot;
        wrapperCommands: string[];
    }): string {
        const { enabled, mode, codex, wrappers, hooks, theiaTools, status, wrapperCommands } = context;
        const summary = this.summarizeProcesses(status);
        const codexHooksStatus = status.codexHooks;
        const lastArtifact = status.lastArtifact?.id ?? 'none';
        const lastProcess = this.formatProcessHeadline(status.lastProcess);
        const lastFailure = this.formatProcessHeadline(summary.lastFailedProcess);
        const lastChangedProcess = this.formatProcessHeadline(summary.lastChangedProcess);
        const lines = [
            nls.localize('theia/cybervinci/aiOutputCleaner/status/title', 'AI Output Cleaner Status'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/enabled', 'Enabled: {0}', enabled ? 'ON' : 'OFF'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/mode', 'Mode: {0}', mode),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/codex', 'Codex integration enabled: {0}', codex ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/wrappers', 'Codex wrappers enabled: {0}', wrappers ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooks', 'Codex hooks enabled: {0}', hooks ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooksReadiness',
                'Codex hooks readiness: {0}', codexHooksStatus?.readiness ?? 'unknown'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooksSupport',
                'Codex hooks support: {0}', this.formatHooksSupport(codexHooksStatus)),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooksPrepared',
                'Codex hooks artifacts: {0}', this.formatHooksArtifacts(codexHooksStatus)),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooksConfigured',
                'Codex hooks configured: {0}', codexHooksStatus?.configured ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/hooksRuntime',
                'Codex hooks runtime enabled: {0}', codexHooksStatus?.artifacts.runtimeEnabled ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/tools', 'IDE tool interception enabled: {0}', theiaTools ? 'YES' : 'NO'),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/wrapperCommands',
                'Wrapper commands: {0}', wrapperCommands.join(', ')),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/artifacts', 'Artifacts folder: {0}', status.artifactRootPath),
            nls.localize(
                'theia/cybervinci/aiOutputCleaner/status/summary',
                'Tracked processes: {0} total ({1} running, {2} completed, {3} failed, {4} changed, {5} with recent output)',
                summary.total.toString(),
                summary.running.toString(),
                summary.completed.toString(),
                summary.failed.toString(),
                summary.changed.toString(),
                summary.withRecentOutput.toString()
            ),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/activeProcesses', 'Active tracked processes: {0}', status.activeProcesses.length.toString()),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/sessionCount', 'Observed sessions: {0}', summary.sessionCount.toString()),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/recentArtifacts', 'Recent artifacts: {0}', status.recentArtifacts.length.toString()),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/lastArtifact', 'Last artifact: {0}', lastArtifact),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/lastProcess', 'Last process: {0}', lastProcess),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/lastFailure', 'Last failure: {0}', lastFailure),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/lastChangedProcess', 'Last changed output: {0}', lastChangedProcess),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/origins', 'Origins observed: {0}', this.formatOriginCounts(summary.originCounts)),
            nls.localize('theia/cybervinci/aiOutputCleaner/status/recentFilters',
                'Recent filters: {0}', status.recentFiltersApplied.join(', ') || 'none')
        ];
        if (codexHooksStatus) {
            lines.push(nls.localize(
                'theia/cybervinci/aiOutputCleaner/status/hooksSummary',
                'Codex hooks summary: {0}',
                codexHooksStatus.summary
            ));
            lines.push(nls.localize(
                'theia/cybervinci/aiOutputCleaner/status/hooksPaths',
                'Codex hooks paths: home={0}; config={1}; helper={2}; log={3}; runtime={4}',
                codexHooksStatus.capability.homePath,
                codexHooksStatus.capability.configPath,
                codexHooksStatus.artifacts.helperScriptPath,
                codexHooksStatus.artifacts.eventLogPath,
                codexHooksStatus.artifacts.runtimeStatePath
            ));
            lines.push(nls.localize(
                'theia/cybervinci/aiOutputCleaner/status/hooksEvidence',
                'Codex hooks evidence: {0}',
                codexHooksStatus.capability.evidence.join('; ') || 'none'
            ));
            lines.push(nls.localize(
                'theia/cybervinci/aiOutputCleaner/status/hooksEvents',
                'Codex hooks events: {0}',
                codexHooksStatus.artifacts.installedEvents.join(', ') || 'none'
            ));
        }
        const activeDetails = status.activeProcesses.map(process =>
            nls.localize('theia/cybervinci/aiOutputCleaner/status/activeDetails', 'Active: {0}', this.formatProcessDetails(process))
        );
        const recentDetails = status.recentProcesses.map(process =>
            nls.localize('theia/cybervinci/aiOutputCleaner/status/recentDetails', 'Recent: {0}', this.formatProcessDetails(process))
        );
        return [...lines, ...activeDetails, ...recentDetails].join('\n');
    }

    protected async openArtifactsFolder(): Promise<void> {
        const path = await this.backendService.getArtifactRootPath();
        const uri = URI.fromFilePath(path);
        await open(this.openerService, uri);
    }

    protected async recreateWrappers(): Promise<void> {
        const wrapperCommands = this.preferenceService.get<string[]>(OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF, []);
        const files = await this.backendService.recreateWrappers(wrapperCommands);
        this.messageService.info(nls.localize(
            'theia/cybervinci/aiOutputCleaner/recreateWrappersDone',
            'AI Output Cleaner recreated {0} wrappers.',
            files.length.toString()
        ));
    }

    protected async installCodexHooks(): Promise<void> {
        const status = await this.backendService.installCodexHooks();
        await Promise.all([
            this.preferenceService.set(OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF, true, PreferenceScope.User),
            this.backendService.setCodexHooksRuntimeEnabled(true)
        ]);
        this.messageService.info(nls.localize(
            'theia/cybervinci/aiOutputCleaner/installCodexHooksDone',
            'Codex hooks installed in {0}.',
            status?.capability.configPath ?? '~/.codex/config.toml'
        ));
    }

    protected async removeCodexHooks(): Promise<void> {
        const status = await this.backendService.removeCodexHooks();
        await this.preferenceService.set(OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF, false, PreferenceScope.User);
        this.messageService.info(nls.localize(
            'theia/cybervinci/aiOutputCleaner/removeCodexHooksDone',
            'Codex hooks removed from {0}.',
            status?.capability.configPath ?? '~/.codex/config.toml'
        ));
    }

    protected async toggleSessionBypass(): Promise<void> {
        const session = this.getActiveChatSession();
        if (!session) {
            this.messageService.warn(nls.localize(
                'theia/cybervinci/aiOutputCleaner/noActiveChatForBypass',
                'Open a chat session before toggling the AI Output Cleaner bypass.'
            ));
            return;
        }
        const current = await this.backendService.getSessionOverride(session.id);
        const next = await this.backendService.setSessionBypass(session.id, !current?.bypassFiltering);
        this.messageService.info(next.bypassFiltering
            ? nls.localize(
                'theia/cybervinci/aiOutputCleaner/sessionBypassEnabled',
                'AI Output Cleaner filtering is now bypassed for chat {0}.',
                session.id
            )
            : nls.localize(
                'theia/cybervinci/aiOutputCleaner/sessionBypassDisabled',
                'AI Output Cleaner filtering is active again for chat {0}.',
                session.id
            ));
    }

    protected async sendRawOutputToAgent(artifactId?: string): Promise<void> {
        const session = this.getActiveChatSession();
        if (!session) {
            this.messageService.warn(nls.localize(
                'theia/cybervinci/aiOutputCleaner/noActiveChatForRawOutput',
                'Open a chat session before sending raw output to the agent.'
            ));
            return;
        }

        const artifact = artifactId
            ? await this.backendService.readRawArtifact(artifactId)
            : await this.resolveLatestArtifactForSession(session.id);
        if (!artifact) {
            this.messageService.warn(nls.localize(
                'theia/cybervinci/aiOutputCleaner/noRawArtifactForChat',
                'No raw output artifact was found for the active chat.'
            ));
            return;
        }
        if (artifact.artifact.sessionId && artifact.artifact.sessionId !== session.id) {
            this.messageService.warn(nls.localize(
                'theia/cybervinci/aiOutputCleaner/rawArtifactSessionMismatch',
                'The selected raw output artifact belongs to a different chat session.'
            ));
            return;
        }

        const invocation = await this.chatService.sendRequest(session.id, {
            text: this.buildRawOutputPrompt(artifact)
        });
        if (!invocation) {
            this.messageService.error(nls.localize(
                'theia/cybervinci/aiOutputCleaner/rawOutputSendFailed',
                'Failed to send raw output to the active agent.'
            ));
            return;
        }
        this.messageService.info(nls.localize(
            'theia/cybervinci/aiOutputCleaner/rawOutputSent',
            'Sent raw output artifact {0} to the active agent.',
            artifact.artifact.id
        ));
    }

    protected getActiveChatSession(): ChatSession | undefined {
        return this.chatService.getActiveSession();
    }

    protected async resolveLatestArtifactForSession(sessionId: string): Promise<AIOutputCleanerRawArtifact | undefined> {
        const [latestArtifact] = await this.backendService.listRecentArtifacts({ sessionId, limit: 1 });
        return latestArtifact ? this.backendService.readRawArtifact(latestArtifact.id) : undefined;
    }

    protected buildRawOutputPrompt(artifact: AIOutputCleanerRawArtifact): string {
        const sections = [
            'Use the following raw, unfiltered tool output from this chat session as the source of truth.',
            `Artifact ID: ${artifact.artifact.id}`,
            `Command: ${artifact.artifact.command}${artifact.artifact.args.length > 0 ? ` ${artifact.artifact.args.join(' ')}` : ''}`
        ];
        if (artifact.stdout) {
            sections.push(`Raw stdout:\n\`\`\`\n${artifact.stdout}\n\`\`\``);
        }
        if (artifact.stderr) {
            sections.push(`Raw stderr:\n\`\`\`\n${artifact.stderr}\n\`\`\``);
        }
        return sections.join('\n\n');
    }

    protected summarizeProcesses(status: AIOutputCleanerStatusSnapshot): {
        total: number;
        running: number;
        completed: number;
        failed: number;
        changed: number;
        withRecentOutput: number;
        sessionCount: number;
        originCounts: Array<{ origin: string; count: number }>;
        lastFailedProcess: AIOutputCleanerProcessStatus | undefined;
        lastChangedProcess: AIOutputCleanerProcessStatus | undefined;
    } {
        const processes = status.recentProcesses;
        const originCounts = new Map<string, number>();
        for (const process of processes) {
            originCounts.set(process.origin, (originCounts.get(process.origin) ?? 0) + 1);
        }
        return {
            total: processes.length,
            running: processes.filter(process => process.status === 'running').length,
            completed: processes.filter(process => process.status === 'completed').length,
            failed: processes.filter(process => process.status === 'failed').length,
            changed: processes.filter(process => process.changed).length,
            withRecentOutput: processes.filter(process => process.hasRecentOutput).length,
            sessionCount: new Set(processes
                .map(process => process.sessionId)
                .filter((sessionId): sessionId is string => Boolean(sessionId))).size,
            originCounts: Array.from(originCounts.entries()).map(([origin, count]) => ({ origin, count })),
            lastFailedProcess: processes.find(process => process.status === 'failed'),
            lastChangedProcess: processes.find(process => process.changed)
        };
    }

    protected formatOriginCounts(originCounts: Array<{ origin: string; count: number }>): string {
        if (originCounts.length === 0) {
            return 'none';
        }
        return originCounts
            .map(entry => `${entry.origin}=${entry.count}`)
            .join(', ');
    }

    protected formatProcessHeadline(process: AIOutputCleanerProcessStatus | undefined): string {
        if (!process) {
            return 'none';
        }
        const sessionPart = process.sessionId ? ` session=${process.sessionId}` : '';
        const filterPart = process.filtersApplied.length > 0 ? ` filters=${process.filtersApplied.join(',')}` : '';
        return `${process.command} [${process.status}]${sessionPart}${filterPart}`;
    }

    protected formatProcessDetails(process: AIOutputCleanerProcessStatus): string {
        const segments = [
            `${process.command} [${process.status}]`,
            `origin=${process.origin}`,
            process.sessionId ? `session=${process.sessionId}` : undefined,
            process.pid !== undefined ? `pid=${process.pid}` : undefined,
            process.changed ? 'changed=yes' : 'changed=no',
            process.filtersApplied.length > 0 ? `filters=${process.filtersApplied.join(',')}` : undefined,
            process.notice ? `notice=${process.notice}` : undefined,
            process.lastStdoutPreview ? `stdout="${process.lastStdoutPreview}"` : undefined,
            process.lastStderrPreview ? `stderr="${process.lastStderrPreview}"` : undefined,
            process.recentLines.length > 0 ? `lines="${process.recentLines.join(' | ')}"` : undefined
        ];
        return segments.filter(Boolean).join('; ');
    }

    protected formatHooksSupport(status: AIOutputCleanerStatusSnapshot['codexHooks']): string {
        if (!status) {
            return 'unknown';
        }
        if (!status.available) {
            return 'codex unavailable';
        }
        return status.supported ? 'supported' : 'unknown';
    }

    protected formatHooksArtifacts(status: AIOutputCleanerStatusSnapshot['codexHooks']): string {
        if (!status) {
            return 'unknown';
        }
        const eventSegment = status.artifacts.eventCount > 0
            ? `events=${status.artifacts.eventCount}`
            : 'events=0';
        return status.artifacts.prepared
            ? `prepared; ${eventSegment}`
            : `unknown; ${eventSegment}`;
    }
}

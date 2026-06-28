// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { ChatService } from '@theia/ai-chat';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { AIOutputCleanerRawArtifact, AIOutputCleanerStatusSnapshot } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerCommandContribution } from './ai-output-cleaner-command-contribution';

class TestAIOutputCleanerCommandContribution extends AIOutputCleanerCommandContribution {
    constructor(
        backendService?: Partial<AIOutputCleanerBackendService>,
        chatService?: Partial<ChatService>,
        messageService?: { info(message: string): void; warn(message: string): void; error(message: string): void }
    ) {
        super();
        (this as unknown as { backendService: Partial<AIOutputCleanerBackendService> }).backendService = backendService ?? {};
        (this as unknown as { chatService: Partial<ChatService> }).chatService = chatService ?? {};
        (this as unknown as { messageService: { info(message: string): void; warn(message: string): void; error(message: string): void } }).messageService =
            messageService ?? { info: () => undefined, warn: () => undefined, error: () => undefined };
    }

    renderStatus(status: AIOutputCleanerStatusSnapshot): string {
        return this.buildStatusMessage({
            enabled: true,
            mode: 'safe',
            codex: true,
            wrappers: true,
            hooks: false,
            theiaTools: true,
            status,
            wrapperCommands: ['git', 'npm']
        });
    }

    async triggerToggleSessionBypass(): Promise<void> {
        return this.toggleSessionBypass();
    }

    async triggerSendRawOutput(artifactId?: string): Promise<void> {
        return this.sendRawOutputToAgent(artifactId);
    }

    renderRawPrompt(artifact: AIOutputCleanerRawArtifact): string {
        return this.buildRawOutputPrompt(artifact);
    }
}

describe('AIOutputCleanerCommandContribution', () => {
    it('renders an observable status summary from the existing snapshot', () => {
        const contribution = new TestAIOutputCleanerCommandContribution();
        const status: AIOutputCleanerStatusSnapshot = {
            artifactRootPath: '/tmp/ai-output-cleaner',
            activeProcesses: [
                {
                    id: 'process-2',
                    command: 'npm',
                    args: ['install'],
                    origin: 'theia-tool',
                    sessionId: 'session-2',
                    pid: 42,
                    startedAt: '2026-01-01T10:00:00.000Z',
                    lastUpdatedAt: '2026-01-01T10:00:03.000Z',
                    status: 'running',
                    changed: false,
                    filtersApplied: [],
                    lastStdoutPreview: 'downloading package-a',
                    lastStderrPreview: '',
                    recentLines: ['downloading package-a', '50%'],
                    hasRecentOutput: true
                }
            ],
            recentProcesses: [
                {
                    id: 'process-3',
                    command: 'git',
                    args: ['status'],
                    origin: 'codex-provider-wrapper',
                    sessionId: 'session-3',
                    startedAt: '2026-01-01T10:05:00.000Z',
                    completedAt: '2026-01-01T10:05:02.000Z',
                    lastUpdatedAt: '2026-01-01T10:05:02.000Z',
                    status: 'failed',
                    exitCode: 1,
                    artifactId: 'artifact-3',
                    changed: false,
                    filtersApplied: [],
                    lastStdoutPreview: '',
                    lastStderrPreview: 'fatal: not a git repository',
                    recentLines: ['fatal: not a git repository'],
                    hasRecentOutput: true
                },
                {
                    id: 'process-2',
                    command: 'npm',
                    args: ['install'],
                    origin: 'theia-tool',
                    sessionId: 'session-2',
                    pid: 42,
                    startedAt: '2026-01-01T10:00:00.000Z',
                    lastUpdatedAt: '2026-01-01T10:00:03.000Z',
                    status: 'running',
                    changed: false,
                    filtersApplied: [],
                    lastStdoutPreview: 'downloading package-a',
                    lastStderrPreview: '',
                    recentLines: ['downloading package-a', '50%'],
                    hasRecentOutput: true
                },
                {
                    id: 'process-1',
                    command: 'npm',
                    args: ['install'],
                    origin: 'theia-tool',
                    sessionId: 'session-1',
                    startedAt: '2026-01-01T09:59:00.000Z',
                    completedAt: '2026-01-01T09:59:02.000Z',
                    lastUpdatedAt: '2026-01-01T09:59:02.000Z',
                    status: 'completed',
                    artifactId: 'artifact-1',
                    changed: true,
                    filtersApplied: ['git-status-advice'],
                    notice: '[CyberVinci notice]',
                    lastStdoutPreview: 'done',
                    lastStderrPreview: '',
                    recentLines: ['done'],
                    hasRecentOutput: true
                }
            ],
            lastProcess: {
                id: 'process-3',
                command: 'git',
                args: ['status'],
                origin: 'codex-provider-wrapper',
                sessionId: 'session-3',
                startedAt: '2026-01-01T10:05:00.000Z',
                completedAt: '2026-01-01T10:05:02.000Z',
                lastUpdatedAt: '2026-01-01T10:05:02.000Z',
                status: 'failed',
                exitCode: 1,
                artifactId: 'artifact-3',
                changed: false,
                filtersApplied: [],
                lastStdoutPreview: '',
                lastStderrPreview: 'fatal: not a git repository',
                recentLines: ['fatal: not a git repository'],
                hasRecentOutput: true
            },
            lastArtifact: {
                id: 'artifact-3',
                path: '/tmp/ai-output-cleaner/artifact-3',
                command: 'git',
                args: ['status'],
                origin: 'codex-provider-wrapper',
                sessionId: 'session-3',
                startedAt: '2026-01-01T10:05:00.000Z',
                completedAt: '2026-01-01T10:05:02.000Z',
                filtersApplied: []
            },
            recentArtifacts: [
                {
                    id: 'artifact-3',
                    path: '/tmp/ai-output-cleaner/artifact-3',
                    command: 'git',
                    args: ['status'],
                    origin: 'codex-provider-wrapper',
                    sessionId: 'session-3',
                    startedAt: '2026-01-01T10:05:00.000Z',
                    completedAt: '2026-01-01T10:05:02.000Z',
                    filtersApplied: []
                },
                {
                    id: 'artifact-1',
                    path: '/tmp/ai-output-cleaner/artifact-1',
                    command: 'npm',
                    args: ['install'],
                    origin: 'theia-tool',
                    sessionId: 'session-1',
                    startedAt: '2026-01-01T09:59:00.000Z',
                    completedAt: '2026-01-01T09:59:02.000Z',
                    filtersApplied: ['git-status-advice']
                }
            ],
            recentFiltersApplied: ['git-status-advice'],
            codexHooks: {
                readiness: 'prepared',
                available: true,
                supported: true,
                configured: false,
                summary: 'Codex hook support was detected and AI Output Cleaner hook artifacts were prepared locally without modifying ~/.codex/config.toml.',
                capability: {
                    readiness: 'prepared',
                    available: true,
                    supported: true,
                    postToolUseCanReplaceToolResult: true,
                    codexVersion: '0.131.0',
                    executablePath: 'C:/Users/test/AppData/Roaming/npm/codex.ps1',
                    binaryPath: 'C:/Users/test/AppData/Roaming/npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/codex/codex.exe',
                    homePath: 'C:/Users/test/.codex',
                    configPath: 'C:/Users/test/.codex/config.toml',
                    helpMentionsHookTrustBypass: true,
                    binaryMentionsConfigRequirementsHooks: true,
                    configSyntaxDocumentedInHelp: false,
                    evidence: [
                        'help exposes --dangerously-bypass-hook-trust',
                        'native binary contains configRequirements.read.hooks',
                        'help does not document hook config syntax'
                    ],
                    checkedAt: '2026-01-01T10:05:01.000Z'
                },
                artifacts: {
                    readiness: 'prepared',
                    rootPath: '/tmp/codex-hooks',
                    helperScriptPath: '/tmp/codex-hooks/ai-output-cleaner-hook.cjs',
                    readmePath: '/tmp/codex-hooks/README.md',
                    eventLogPath: '/tmp/codex-hooks/hook-events.ndjson',
                    runtimeStatePath: '/tmp/codex-hooks/runtime-state.json',
                    prepared: true,
                    configured: false,
                    runtimeEnabled: true,
                    managedBlockInstalled: false,
                    eventCount: 0,
                    installedEvents: [],
                    errors: []
                }
            },
            updatedAt: '2026-01-01T10:05:02.000Z'
        };

        const message = contribution.renderStatus(status);

        expect(message).to.contain('Codex hooks readiness: prepared');
        expect(message).to.contain('Codex hooks support: supported');
        expect(message).to.contain('Codex hooks artifacts: prepared; events=0');
        expect(message).to.contain('Codex hooks configured: NO');
        expect(message).to.contain('Codex hooks runtime enabled: YES');
        expect(message).to.contain('Codex hooks summary: Codex hook support was detected and AI Output Cleaner hook artifacts were prepared locally without modifying ~/.codex/config.toml.');
        expect(message).to.contain('Codex hooks paths: home=C:/Users/test/.codex; config=C:/Users/test/.codex/config.toml; helper=/tmp/codex-hooks/ai-output-cleaner-hook.cjs; log=/tmp/codex-hooks/hook-events.ndjson; runtime=/tmp/codex-hooks/runtime-state.json');
        expect(message).to.contain('Codex hooks evidence: help exposes --dangerously-bypass-hook-trust; native binary contains configRequirements.read.hooks; help does not document hook config syntax');
        expect(message).to.contain('Codex hooks events: none');
        expect(message).to.contain('Tracked processes: 3 total (1 running, 1 completed, 1 failed, 1 changed, 3 with recent output)');
        expect(message).to.contain('Observed sessions: 3');
        expect(message).to.contain('Last process: git [failed] session=session-3');
        expect(message).to.contain('Last failure: git [failed] session=session-3');
        expect(message).to.contain('Last changed output: npm [completed] session=session-1 filters=git-status-advice');
        expect(message).to.contain('Origins observed: codex-provider-wrapper=1, theia-tool=2');
        expect(message).to.contain('Active: npm [running]; origin=theia-tool; session=session-2; pid=42; changed=no; stdout="downloading package-a"; lines="downloading package-a | 50%"');
        expect(message).to.contain('Recent: git [failed]; origin=codex-provider-wrapper; session=session-3; changed=no; stderr="fatal: not a git repository"; lines="fatal: not a git repository"');
        expect(message).to.contain('Recent: npm [completed]; origin=theia-tool; session=session-1; changed=yes; filters=git-status-advice; notice=[CyberVinci notice]; stdout="done"; lines="done"');
    });

    it('toggles bypass on the active chat session', async () => {
        const updates: Array<{ sessionId: string; bypassFiltering: boolean }> = [];
        const contribution = new TestAIOutputCleanerCommandContribution({
            getSessionOverride: async () => undefined,
            setSessionBypass: async (sessionId, bypassFiltering) => {
                updates.push({ sessionId, bypassFiltering });
                return {
                    sessionId,
                    bypassFiltering,
                    updatedAt: '2026-01-01T10:00:00.000Z'
                };
            }
        }, {
            getActiveSession: () => ({
                id: 'session-1',
                model: {} as never,
                isActive: true
            })
        });

        await contribution.triggerToggleSessionBypass();

        expect(updates).to.deep.equal([{ sessionId: 'session-1', bypassFiltering: true }]);
    });

    it('sends the latest raw artifact back to the active agent using the active session', async () => {
        const sentRequests: Array<{ sessionId: string; text: string }> = [];
        const contribution = new TestAIOutputCleanerCommandContribution({
            listRecentArtifacts: async () => [{
                id: 'artifact-1',
                path: '/tmp/artifact-1',
                command: 'git',
                args: ['status'],
                sessionId: 'session-1',
                startedAt: '2026-01-01T10:00:00.000Z',
                completedAt: '2026-01-01T10:00:01.000Z',
                filtersApplied: []
            }],
            readRawArtifact: async () => ({
                artifact: {
                    id: 'artifact-1',
                    path: '/tmp/artifact-1',
                    command: 'git',
                    args: ['status'],
                    sessionId: 'session-1',
                    startedAt: '2026-01-01T10:00:00.000Z',
                    completedAt: '2026-01-01T10:00:01.000Z',
                    filtersApplied: []
                },
                stdout: 'raw stdout',
                stderr: 'raw stderr'
            })
        }, {
            getActiveSession: () => ({
                id: 'session-1',
                model: {} as never,
                isActive: true
            }),
            sendRequest: async (sessionId, request) => {
                sentRequests.push({ sessionId, text: request.text });
                return {
                    requestCompleted: Promise.resolve({} as never),
                    responseCreated: Promise.resolve({} as never),
                    responseCompleted: Promise.resolve({} as never)
                };
            }
        });

        await contribution.triggerSendRawOutput();

        expect(sentRequests).to.have.length(1);
        expect(sentRequests[0].sessionId).to.equal('session-1');
        expect(sentRequests[0].text).to.contain('Artifact ID: artifact-1');
        expect(sentRequests[0].text).to.contain('raw stdout');
        expect(sentRequests[0].text).to.contain('raw stderr');
    });
});

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { nls } from '@theia/core';
import {
    AIOutputCleanerInput,
    AIOutputCleanerMode,
    AIOutputCleanerResult,
    AIOutputCleanerServiceConfig
} from './ai-output-cleaner-types';

const DEFAULT_LITERAL_BYPASS_PATTERNS = [
    'mojibake',
    'encoding',
    'utf-8',
    'latin-1',
    'caracteres',
    'símbolos',
    'conteúdo literal',
    'texto quebrado',
    'acento',
    'corrompido',
    'escape sequence',
    'ansi'
];

const DEFAULT_STATUS_INTENT_PATTERNS = [
    'ainda está rodando',
    'ainda está instalando',
    'já terminou',
    'acabou',
    'travou',
    'progresso',
    'continua executando',
    'está baixando',
    'processo ativo',
    'instalação acabou'
];

interface FilterResult {
    text: string;
    removedLines: number;
}

interface InternalConfig {
    enabled: boolean;
    mode: AIOutputCleanerMode;
    showFilteringNotice: boolean;
    wrapperCommands: string[];
    literalBypassPatterns: string[];
    statusIntentPatterns: string[];
}

export class AIOutputCleanerService {

    protected readonly config: InternalConfig;

    constructor(config: AIOutputCleanerServiceConfig = {}) {
        this.config = {
            enabled: config.enabled ?? false,
            mode: config.mode ?? 'safe',
            showFilteringNotice: config.showFilteringNotice ?? true,
            wrapperCommands: (config.wrapperCommands ?? ['git', 'rg', 'npm', 'pnpm', 'yarn', 'node', 'python', 'pytest', 'cargo', 'docker']).map(command => command.toLowerCase()),
            literalBypassPatterns: (config.literalBypassPatterns ?? DEFAULT_LITERAL_BYPASS_PATTERNS).map(value => value.toLowerCase()),
            statusIntentPatterns: (config.statusIntentPatterns ?? DEFAULT_STATUS_INTENT_PATTERNS).map(value => value.toLowerCase())
        };
    }

    clean(input: AIOutputCleanerInput): AIOutputCleanerResult {
        const command = this.normalizeCommand(input.command ?? (input.args?.[0] ?? ''));
        const stdout = input.stdout ?? '';
        const stderr = input.stderr ?? '';

        if (!this.shouldProcess(command)) {
            return this.bypassResult(input, stdout, stderr, [nls.localize('theia/cybervinci/aiOutputCleaner/bypassed/off', 'Output cleaner is disabled.')]);
        }

        if (this.isStatusAwareAndRunning(input)) {
            return this.bypassResult(input, stdout, stderr, [nls.localize('theia/cybervinci/aiOutputCleaner/bypassed/statusAware', 'Preserving running status output.')]);
        }

        if (this.isLiteralIntent(input.prompt)) {
            return this.bypassResult(input, stdout, stderr, [nls.localize('theia/cybervinci/aiOutputCleaner/bypassed/literal', 'Bypassed due to literal/encoding intent.')]);
        }

        const commandFilters = this.cleanForCommand(command, stdout, stderr, input);
        return {
            ...commandFilters,
            exitCode: input.exitCode,
            notice: commandFilters.changed && this.config.showFilteringNotice
                ? nls.localize('theia/cybervinci/aiOutputCleaner/notice',
                    '[CyberVinci AI Output Cleaner removed {0} known-noise lines: {1}.]',
                    commandFilters.removedLineCount.toString(),
                    commandFilters.filtersApplied.join(', '))
                : undefined
        };
    }

    protected cleanForCommand(command: string, stdout: string, stderr: string, input: AIOutputCleanerInput): AIOutputCleanerResult {
        const commandName = this.normalizeCommandName(command, input.args);
        const args = this.normalizeArgs(input.args);

        if (commandName === 'git' && args.includes('status')) {
            const filtered = this.removeGitStatusAdviceLines(stdout);
            return {
                stdout: filtered.text,
                stderr,
                changed: filtered.removedLines > 0,
                removedLineCount: filtered.removedLines,
                filtersApplied: filtered.removedLines > 0 ? ['git-status-advice'] : []
            };
        }

        if (this.shouldStripAnsi(commandName)) {
            const strippedStdout = this.stripAnsi(stdout);
            const strippedStderr = this.stripAnsi(stderr);
            const hasChange = strippedStdout !== stdout || strippedStderr !== stderr;
            return {
                stdout: strippedStdout,
                stderr: strippedStderr,
                changed: hasChange,
                removedLineCount: hasChange ? 1 : 0,
                filtersApplied: hasChange ? ['ansi-strip'] : []
            };
        }

        return {
            stdout,
            stderr,
            changed: false,
            removedLineCount: 0,
            filtersApplied: []
        };
    }

    protected removeGitStatusAdviceLines(text: string): FilterResult {
        const lines = text.split(/\r?\n/);
        const kept: string[] = [];
        let removedLines = 0;

        const advicePatterns = [
            /no changes added to commit/i,
            /nothing added to commit but untracked files present/i,
            /^\(use "git add <file>\.\.\." to update what will be committed\)$/i,
            /^\(use "git restore --staged <file>\.\.\." to discard changes in the staged files\)/i,
            /^\(use "git restore <file>\.\.\." to discard changes in working directory\)/i,
            /^\(use "git add <file>\.\.\." to include in what will be committed\)/i
        ];

        for (const line of lines) {
            if (advicePatterns.some(pattern => pattern.test(line.trim()))) {
                removedLines++;
                continue;
            }
            kept.push(line);
        }

        return {
            text: kept.join('\n'),
            removedLines
        };
    }

    protected shouldProcess(command: string): boolean {
        if (!this.config.enabled) {
            return false;
        }
        if (this.config.mode === 'off') {
            return false;
        }
        if (this.config.mode === 'raw') {
            return false;
        }
        return true;
    }

    protected isStatusAwareAndRunning(input: AIOutputCleanerInput): boolean {
        if (this.config.mode !== 'status-aware') {
            return false;
        }
        if (input.status === 'running') {
            return true;
        }
        if (input.prompt && this.isLiteralIntent(input.prompt, this.config.statusIntentPatterns)) {
            return true;
        }
        return false;
    }

    protected isLiteralIntent(prompt = '', patterns = this.config.literalBypassPatterns): boolean {
        if (!prompt) {
            return false;
        }
        const normalized = prompt.toLowerCase();
        return patterns.some(pattern => normalized.includes(pattern));
    }

    protected normalizeCommand(raw: string): string {
        if (!raw) {
            return '';
        }
        const trimmed = raw.trim();
        if (!trimmed) {
            return '';
        }
        return trimmed.toLowerCase();
    }

    protected normalizeCommandName(command: string, args?: string[]): string {
        if (!command && args?.length) {
            return this.normalizeCommand(args[0] ?? '');
        }
        const executable = command.split(/\s+/)[0] ?? command;
        return this.normalizeCommand(executable.split(/[\\/]/).pop() ?? executable);
    }

    protected normalizeArgs(args?: string[]): string[] {
        return args?.map(arg => arg.toLowerCase()) ?? [];
    }

    protected shouldStripAnsi(command: string): boolean {
        if (!this.config.wrapperCommands.length) {
            return false;
        }
        return this.config.wrapperCommands.includes(command);
    }

    protected stripAnsi(text: string): string {
        if (!text) {
            return text;
        }
        return text.replace(/\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
    }

    protected bypassResult(input: AIOutputCleanerInput, stdout: string, stderr: string, filtersApplied: string[]): AIOutputCleanerResult {
        return {
            stdout,
            stderr,
            exitCode: input.exitCode,
            changed: false,
            removedLineCount: 0,
            filtersApplied,
            notice: this.config.showFilteringNotice ? this.toBypassNotice() : undefined
        };
    }

    protected toBypassNotice(): string {
        return nls.localize('theia/cybervinci/aiOutputCleaner/bypassNotice',
            '[CyberVinci AI Output Cleaner bypassed filtering because the task may depend on literal content.]');
    }
}

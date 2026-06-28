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
import { AIOutputCleanerServiceConfig } from './ai-output-cleaner-types';
import { AIOutputCleanerService } from './ai-output-cleaner-service';

function buildService(config: AIOutputCleanerServiceConfig = {}): AIOutputCleanerService {
    return new AIOutputCleanerService({
        enabled: true,
        mode: 'safe',
        ...config
    });
}

describe('AIOutputCleanerService', () => {

    it('removes only known git status advice lines', () => {
        const service = buildService();
        const output = [
            'On branch main',
            'nothing to commit, working tree clean',
            '(use "git add <file>..." to update what will be committed)',
            'nothing added to commit but untracked files present',
            '(use "git restore --staged <file>..." to discard changes in the staged files)',
            'modified:   src/index.ts',
            '(use "git add <file>..." to include in what will be committed)',
            'Untracked files:'
        ].join('\n');
        const result = service.clean({
            origin: 'codex-provider-wrapper',
            command: 'git',
            args: ['git', 'status'],
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(true);
        expect(result.removedLineCount).to.equal(4);
        expect(result.filtersApplied).to.deep.equal(['git-status-advice']);
        expect(result.stdout).to.equal([
            'On branch main',
            'nothing to commit, working tree clean',
            'modified:   src/index.ts',
            'Untracked files:'
        ].join('\n'));
    });

    it('preserves file names from git status output', () => {
        const service = buildService();
        const output = [
            'On branch feature/a',
            'modified:   src/file.ts',
            'added:      src/new.ts',
            'deleted:    src/removed.ts'
        ].join('\n');
        const result = service.clean({
            origin: 'codex-provider-wrapper',
            command: 'git',
            args: ['status'],
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });

    it('keeps git diff output raw by default', () => {
        const service = buildService();
        const output = [
            'diff --git a/src/main.ts b/src/main.ts',
            '@@ -1,2 +1,2 @@',
            '-console.log("old");',
            '+console.log("new");'
        ].join('\n');
        const result = service.clean({
            origin: 'codex-provider-wrapper',
            command: 'git',
            args: ['diff'],
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });

    it('bypasses filtering for literal/encoding intent', () => {
        const service = buildService();
        const output = 'Ã§ Ã£ â€™ Ã¢â‚¬â„¢ mojibake';
        const result = service.clean({
            origin: 'theia-tool',
            command: 'cat',
            args: ['cat', 'weird.txt'],
            prompt: 'investigue caracteres, mojibake e acentos quebrados',
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });

    it('keeps ansi escape sequences when prompt requests ansi intent', () => {
        const service = buildService();
        const output = '\u001b[31merror\u001b[0m';
        const result = service.clean({
            origin: 'theia-tool',
            command: 'python',
            args: ['python', 'script.py'],
            prompt: 'A saída contém ansi/escape, não remova.',
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });

    it('preserves progress-like output in status-aware running mode', () => {
        const service = buildService({ mode: 'status-aware' });
        const output = [
            'Downloading packages...',
            '██████░░░░ 42%',
            'Done.'
        ].join('\n');
        const result = service.clean({
            origin: 'theia-tool',
            command: 'npm',
            args: ['npm', 'install'],
            status: 'running',
            stdout: output,
            exitCode: undefined
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });

    it('passes unknown commands unchanged', () => {
        const service = buildService();
        const output = 'custom command output with anything';
        const result = service.clean({
            origin: 'manual-debug',
            command: 'mysterytool',
            stdout: output,
            exitCode: 1
        });

        expect(result.changed).to.equal(false);
        expect(result.exitCode).to.equal(1);
        expect(result.stdout).to.equal(output);
    });

    it('does not filter output when disabled by configuration', () => {
        const service = new AIOutputCleanerService({ enabled: false, mode: 'safe' });
        const output = [
            'On branch main',
            'nothing added to commit but untracked files present',
            '(use "git add <file>..." to update what will be committed)',
            'modified:   src/index.ts'
        ].join('\n');
        const result = service.clean({
            origin: 'codex-provider-wrapper',
            command: 'git',
            args: ['status'],
            stdout: output,
            exitCode: 0
        });

        expect(result.changed).to.equal(false);
        expect(result.stdout).to.equal(output);
    });
});

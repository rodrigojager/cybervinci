// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as fs from 'fs/promises';
import * as path from 'path';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class AIOutputCleanerCommandWrapperManager {

    async ensureWrappers(wrapperBinPath: string, commands: string[]): Promise<string[]> {
        await fs.mkdir(wrapperBinPath, { recursive: true });
        const normalizedCommands = this.normalizeCommands(commands);
        const files: string[] = [];
        for (const command of normalizedCommands) {
            const wrapperPath = await this.writeWrapper(wrapperBinPath, command);
            files.push(wrapperPath);
        }
        return files;
    }

    protected normalizeCommands(commands: string[]): string[] {
        const seen = new Set<string>();
        const normalized: string[] = [];
        for (const command of commands.map(value => value.trim().toLowerCase()).filter(Boolean)) {
            if (!seen.has(command)) {
                seen.add(command);
                normalized.push(command);
            }
        }
        return normalized;
    }

    protected async writeWrapper(wrapperBinPath: string, command: string): Promise<string> {
        if (process.platform === 'win32') {
            const wrapperPath = path.join(wrapperBinPath, `${command}.cmd`);
            await fs.writeFile(wrapperPath, this.createWindowsWrapperContent(command), 'utf8');
            return wrapperPath;
        }
        const wrapperPath = path.join(wrapperBinPath, command);
        await fs.writeFile(wrapperPath, this.createPosixWrapperContent(command), { encoding: 'utf8', mode: 0o755 });
        return wrapperPath;
    }

    protected createWindowsWrapperContent(command: string): string {
        return [
            '@echo off',
            'setlocal',
            `"${this.getNodeExecutablePath()}" "${this.getWrapperHostScriptPath()}" --command "${command}" %*`,
            'exit /b %ERRORLEVEL%'
        ].join('\r\n');
    }

    protected createPosixWrapperContent(command: string): string {
        return [
            '#!/usr/bin/env bash',
            `exec "${this.getNodeExecutablePath()}" "${this.getWrapperHostScriptPath()}" --command "${command}" "$@"`
        ].join('\n');
    }

    protected getNodeExecutablePath(): string {
        return process.execPath;
    }

    protected getWrapperHostScriptPath(): string {
        return path.join(__dirname, 'ai-output-cleaner-command-wrapper.js');
    }
}

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { injectable } from '@theia/core/shared/inversify';
import { AIOutputCleanerArtifactQuery, AIOutputCleanerProcessStatus } from '../common/ai-output-cleaner-types';

@injectable()
export class AIOutputCleanerStatusStore {

    async getStatusRootPath(): Promise<string> {
        const root = this.getStatusRootDirectory();
        await fs.mkdir(root, { recursive: true });
        return root;
    }

    async getProcess(id: string): Promise<AIOutputCleanerProcessStatus | undefined> {
        try {
            const data = await fs.readFile(await this.getProcessFilePath(id), 'utf8');
            return JSON.parse(data) as AIOutputCleanerProcessStatus;
        } catch {
            return undefined;
        }
    }

    async saveProcess(status: AIOutputCleanerProcessStatus): Promise<void> {
        const target = await this.getProcessFilePath(status.id);
        const tempFile = `${target}.tmp-${process.pid ?? '0'}`;
        await fs.writeFile(tempFile, JSON.stringify(status, undefined, 2), 'utf8');
        await fs.rename(tempFile, target);
    }

    async listProcesses(query: AIOutputCleanerArtifactQuery = {}): Promise<AIOutputCleanerProcessStatus[]> {
        const root = await this.getStatusRootPath();
        const entries = await fs.readdir(root, { withFileTypes: true });
        const processes: AIOutputCleanerProcessStatus[] = [];
        for (const entry of entries) {
            if (!entry.isFile() || path.extname(entry.name) !== '.json') {
                continue;
            }
            const processStatus = await this.readProcess(path.join(root, entry.name));
            if (processStatus) {
                processes.push(processStatus);
            }
        }
        return processes
            .filter(process => !query.sessionId || process.sessionId === query.sessionId)
            .filter(process => !query.origin || process.origin === query.origin)
            .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt));
    }

    protected async readProcess(filePath: string): Promise<AIOutputCleanerProcessStatus | undefined> {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data) as AIOutputCleanerProcessStatus;
        } catch {
            return undefined;
        }
    }

    protected async getProcessFilePath(id: string): Promise<string> {
        const root = await this.getStatusRootPath();
        return path.join(root, `${this.toFileName(id)}.json`);
    }

    protected toFileName(id: string): string {
        return createHash('sha1').update(id).digest('hex');
    }

    protected getStatusRootDirectory(): string {
        const overridePath = process.env.CYBERVINCI_OUTPUT_CLEANER_STATUS_ROOT?.trim();
        if (overridePath) {
            return overridePath;
        }
        const appData = process.env.APPDATA;
        if (appData) {
            return path.join(appData, 'CyberVinci', 'ai-output-cleaner', 'status', 'processes');
        }
        return path.join(os.homedir(), '.cybervinci', 'ai-output-cleaner', 'status', 'processes');
    }
}

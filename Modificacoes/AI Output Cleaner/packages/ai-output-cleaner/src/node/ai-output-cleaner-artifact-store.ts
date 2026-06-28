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
import {
    ArtifactMetadata,
    ArtifactStoreInput,
    AIOutputCleanerArtifactQuery,
    AIOutputCleanerRawArtifact,
    AIOutputCleanerSessionOverride,
    SavedArtifact
} from '../common/ai-output-cleaner-types';

@injectable()
export class AIOutputCleanerArtifactStore {

    protected static readonly sessionOverridesBySession = new Map<string, AIOutputCleanerSessionOverride>();

    async getArtifactRootPath(): Promise<string> {
        const root = await this.getArtifactRootDirectory();
        await fs.mkdir(root, { recursive: true });
        return root;
    }

    async saveArtifact(input: ArtifactStoreInput): Promise<SavedArtifact> {
        const root = await this.getArtifactRootPath();
        const artifact = this.buildMetadata(input);
        let artifactPath = path.join(root, artifact.id);
        if (await this.pathExists(artifactPath)) {
            artifact.id = `${artifact.id}-${Date.now()}`;
            artifactPath = path.join(root, artifact.id);
        }
        await fs.mkdir(artifactPath, { recursive: true });
        await fs.writeFile(path.join(artifactPath, 'stdout.txt'), input.stdout, 'utf8');
        await fs.writeFile(path.join(artifactPath, 'stderr.txt'), input.stderr, 'utf8');
        const artifactMetadata = this.toMetadataFile(artifact);
        await fs.writeFile(path.join(artifactPath, 'metadata.json'), JSON.stringify(artifactMetadata, undefined, 2), 'utf8');
        return {
            ...artifactMetadata,
            path: artifactPath
        };
    }

    async listArtifacts(queryOrLimit: AIOutputCleanerArtifactQuery | number = 20): Promise<SavedArtifact[]> {
        const query = typeof queryOrLimit === 'number' ? { limit: queryOrLimit } : queryOrLimit;
        const root = await this.getArtifactRootPath();
        const entries = await fs.readdir(root, { withFileTypes: true });
        const candidates = entries.filter(entry => entry.isDirectory());
        const list: SavedArtifact[] = [];
        for (const candidate of candidates) {
            const file = await this.readMetadata(path.join(root, candidate.name));
            if (file) {
                list.push(file);
            }
        }
        list.sort((left, right) => right.completedAt.localeCompare(left.completedAt));
        const filtered = list
            .filter(artifact => !query.sessionId || artifact.sessionId === query.sessionId)
            .filter(artifact => !query.origin || artifact.origin === query.origin);
        return filtered.slice(0, query.limit ?? 20);
    }

    async readArtifact(id: string): Promise<AIOutputCleanerRawArtifact | undefined> {
        const root = await this.getArtifactRootPath();
        const artifactPath = path.join(root, id);
        const artifact = await this.readMetadata(artifactPath);
        if (!artifact) {
            return undefined;
        }
        const [stdout, stderr] = await Promise.all([
            fs.readFile(path.join(artifactPath, 'stdout.txt'), 'utf8'),
            fs.readFile(path.join(artifactPath, 'stderr.txt'), 'utf8')
        ]);
        return { artifact, stdout, stderr };
    }

    async getSessionOverride(sessionId: string): Promise<AIOutputCleanerSessionOverride | undefined> {
        return AIOutputCleanerArtifactStore.sessionOverridesBySession.get(sessionId);
    }

    async setSessionBypass(sessionId: string, bypassFiltering: boolean): Promise<AIOutputCleanerSessionOverride> {
        const override: AIOutputCleanerSessionOverride = {
            sessionId,
            bypassFiltering,
            updatedAt: new Date().toISOString()
        };
        AIOutputCleanerArtifactStore.sessionOverridesBySession.set(sessionId, override);
        return override;
    }

    protected async readMetadata(artifactPath: string): Promise<SavedArtifact | undefined> {
        try {
            const metadataText = await fs.readFile(path.join(artifactPath, 'metadata.json'), 'utf8');
            const raw = JSON.parse(metadataText) as ArtifactMetadata & { path?: string };
            return {
                ...raw,
                path: artifactPath
            };
        } catch {
            return undefined;
        }
    }

    protected buildMetadata(input: ArtifactStoreInput): ArtifactMetadata {
        const startedAt = input.startedAt ?? new Date().toISOString();
        const completedAt = input.completedAt ?? new Date().toISOString();
        return {
            id: this.makeArtifactId(input, startedAt, completedAt),
            command: input.command,
            args: input.args ?? [],
            cwd: input.cwd,
            origin: input.origin,
            provider: input.provider,
            sessionId: input.sessionId,
            exitCode: input.exitCode,
            startedAt,
            completedAt,
            durationMs: input.durationMs,
            filtersApplied: input.filtersApplied ?? []
        };
    }

    protected toMetadataFile(metadata: ArtifactMetadata): ArtifactMetadata {
        return metadata;
    }

    protected makeArtifactId(input: ArtifactStoreInput, startedAt: string, completedAt: string): string {
        const normalized = JSON.stringify({
            command: input.command,
            args: input.args ?? [],
            cwd: input.cwd,
            startedAt,
            completedAt,
            stdout: this.hashText(input.stdout),
            stderr: this.hashText(input.stderr),
            filtersApplied: input.filtersApplied ?? []
        });
        return createHash('sha256').update(normalized).digest('hex').slice(0, 20);
    }

    protected hashText(value: string): string {
        return createHash('sha1').update(value).digest('hex');
    }

    protected async pathExists(candidate: string): Promise<boolean> {
        try {
            await fs.access(candidate);
            return true;
        } catch {
            return false;
        }
    }

    protected getArtifactRootDirectory(): string {
        const overridePath = process.env.CYBERVINCI_OUTPUT_CLEANER_ARTIFACT_ROOT?.trim();
        if (overridePath) {
            return overridePath;
        }
        const appData = process.env.APPDATA;
        if (appData) {
            return path.join(appData, 'CyberVinci', 'ai-output-cleaner', 'artifacts', 'raw-output');
        }
        return path.join(os.homedir(), '.cybervinci', 'ai-output-cleaner', 'artifacts', 'raw-output');
    }
}

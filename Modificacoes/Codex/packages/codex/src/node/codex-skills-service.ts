// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import { readdir } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { parseCodexRpcParams } from '../common/codex-host-protocol';

export interface CodexRecommendedSkill {
    id: string;
    name: string;
    description: string;
    path: string;
    installed: boolean;
    source: 'bundled' | 'user' | 'curated';
}

@injectable()
export class CodexSkillsService {

    async recommendedSkills(params: unknown): Promise<{ skills: CodexRecommendedSkill[]; error: string | null }> {
        const record = parseCodexRpcParams(params);
        const refresh = record.refresh === true;
        const codexHome = await this.resolveCodexHome(record);
        try {
            const skills = await this.scanSkills(codexHome, refresh);
            return { skills, error: null };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { skills: [], error: message };
        }
    }

    async readPluginSkill(params: unknown): Promise<{ content: string }> {
        const record = parseCodexRpcParams(params);
        const skillPath = typeof record.path === 'string'
            ? record.path
            : typeof record.skillPath === 'string'
                ? record.skillPath
                : undefined;
        if (!skillPath) {
            return { content: '' };
        }
        const skillFile = (await fs.pathExists(path.join(skillPath, 'SKILL.md')))
            ? path.join(skillPath, 'SKILL.md')
            : skillPath;
        if (!(await fs.pathExists(skillFile))) {
            return { content: '' };
        }
        const content = await fs.readFile(skillFile, 'utf8');
        return { content };
    }

    async installRecommendedSkill(params: unknown): Promise<{ ok: boolean; path?: string }> {
        const record = parseCodexRpcParams(params);
        const skillId = typeof record.skillId === 'string'
            ? record.skillId
            : typeof record.id === 'string'
                ? record.id
                : undefined;
        const sourcePath = typeof record.path === 'string' ? record.path : undefined;
        if (!skillId || !sourcePath) {
            return { ok: false };
        }
        const codexHome = await this.resolveCodexHome(record);
        const targetDir = path.join(codexHome, 'skills', skillId);
        await fs.ensureDir(targetDir);
        await fs.copy(sourcePath, targetDir, { overwrite: true, errorOnExist: false });
        return { ok: true, path: targetDir };
    }

    protected async resolveCodexHome(params: Record<string, unknown>): Promise<string> {
        if (typeof params.codexHome === 'string' && params.codexHome.length > 0) {
            return params.codexHome;
        }
        const envHome = process.env.CODEX_HOME;
        if (envHome && envHome.length > 0) {
            return envHome;
        }
        const userHome = process.env.HOME ?? os.homedir();
        const candidate = path.join(userHome, '.codex');
        await fs.ensureDir(candidate);
        return candidate;
    }

    protected async scanSkills(codexHome: string, _refresh: boolean): Promise<CodexRecommendedSkill[]> {
        const roots = [
            { root: path.join(codexHome, 'skills'), source: 'user' as const },
            { root: path.join(codexHome, 'vendor_imports', 'skills'), source: 'bundled' as const }
        ];
        const skills: CodexRecommendedSkill[] = [];
        const seen = new Set<string>();
        for (const { root, source } of roots) {
            if (!(await fs.pathExists(root))) {
                continue;
            }
            const entries = await readdir(root, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const skillId = entry.name;
                if (seen.has(skillId)) {
                    continue;
                }
                seen.add(skillId);
                const skillDir = path.join(root, skillId);
                const metadata = await this.readSkillMetadata(skillDir, skillId, source);
                skills.push(metadata);
            }
        }
        return skills.sort((left, right) => left.name.localeCompare(right.name));
    }

    protected async readSkillMetadata(
        skillDir: string,
        skillId: string,
        source: CodexRecommendedSkill['source']
    ): Promise<CodexRecommendedSkill> {
        const skillFile = path.join(skillDir, 'SKILL.md');
        let description = '';
        let name = skillId;
        if (await fs.pathExists(skillFile)) {
            const content = await fs.readFile(skillFile, 'utf8');
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch?.[1]) {
                name = titleMatch[1].trim();
            }
            const paragraph = content
                .replace(/^---[\s\S]*?---/m, '')
                .split('\n')
                .map(line => line.trim())
                .find(line => line.length > 0 && !line.startsWith('#'));
            description = paragraph ?? '';
        }
        return {
            id: skillId,
            name,
            description,
            path: skillDir,
            installed: source === 'user',
            source
        };
    }
}

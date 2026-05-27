// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from '@theia/core/shared/fs-extra';
import * as os from 'os';
import * as path from 'path';
import { CodexSkillsService } from './codex-skills-service';

describe('CodexSkillsService', () => {
    let service: CodexSkillsService;
    let tempHome: string;

    beforeEach(async () => {
        service = new CodexSkillsService();
        tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-skills-'));
        const skillDir = path.join(tempHome, 'skills', 'demo-skill');
        await fs.ensureDir(skillDir);
        await fs.writeFile(path.join(skillDir, 'SKILL.md'), '# Demo Skill\n\nA helpful demo skill.');
    });

    afterEach(async () => {
        await fs.remove(tempHome);
    });

    it('scans skills from codex home', async () => {
        const result = await service.recommendedSkills({ params: { codexHome: tempHome } });
        expect(result.error).to.equal(null);
        expect(result.skills).to.have.length(1);
        expect(result.skills[0].id).to.equal('demo-skill');
        expect(result.skills[0].name).to.equal('Demo Skill');
    });

    it('reads plugin skill content', async () => {
        const skillDir = path.join(tempHome, 'skills', 'demo-skill');
        const result = await service.readPluginSkill({ params: { path: skillDir } });
        expect(result.content).to.include('Demo Skill');
    });
});

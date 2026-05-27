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
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AIOutputCleanerCommandWrapperManager } from './ai-output-cleaner-command-wrapper-manager';

describe('AIOutputCleanerCommandWrapperManager', () => {

    it('creates one wrapper per normalized command', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-output-cleaner-wrapper-manager-'));
        const manager = new AIOutputCleanerCommandWrapperManager();

        const files = await manager.ensureWrappers(root, ['git', 'Git', 'rg', '']);

        expect(files.map(file => path.basename(file).toLowerCase())).to.deep.equal(
            process.platform === 'win32'
                ? ['git.cmd', 'rg.cmd']
                : ['git', 'rg']
        );
        const gitWrapper = await fs.readFile(files[0], 'utf8');
        expect(gitWrapper).to.contain('ai-output-cleaner-command-wrapper.js');
        expect(gitWrapper.toLowerCase()).to.contain('git');
    });
});

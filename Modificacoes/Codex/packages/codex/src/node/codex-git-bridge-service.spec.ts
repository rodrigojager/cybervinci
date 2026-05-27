// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as os from 'os';
import { CodexGitBridgeService } from './codex-git-bridge-service';
import { parseCodexRpcParams } from '../common/codex-host-protocol';

describe('CodexGitBridgeService', () => {
    let service: CodexGitBridgeService;

    beforeEach(() => {
        service = new CodexGitBridgeService();
    });

    it('returns homeDir with git-origins', async () => {
        const result = await service.gitOrigins({ params: { dirs: [process.cwd()] } });
        expect(result.homeDir).to.equal(os.homedir());
        expect(result.origins).to.have.length(1);
        expect(result.origins[0].dir).to.equal(process.cwd());
    });

    it('returns null merge base when base branch is missing', async () => {
        const result = await service.gitMergeBase({ params: { gitRoot: process.cwd() } });
        expect(result.mergeBaseSha).to.equal(null);
    });
});

describe('parseCodexRpcParams', () => {
    it('unwraps nested params', () => {
        expect(parseCodexRpcParams({ params: { dirs: ['.'] } }).dirs).to.deep.equal(['.']);
        expect(parseCodexRpcParams({ dirs: ['.'] }).dirs).to.deep.equal(['.']);
    });
});

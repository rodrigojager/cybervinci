// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../../..');

function readText(relativePath: string): string {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
    return JSON.parse(readText(relativePath)) as T;
}

function pathExists(relativePath: string): boolean {
    return fs.existsSync(path.join(repoRoot, relativePath));
}

describe('Arena product contract', () => {
    it('remains a frontend/backend Theia extension in the CyberVinci product', () => {
        const packageJson = readJson<{ name: string; theiaExtensions: Array<{ frontend?: string; backend?: string }> }>('packages/arena/package.json');
        expect(packageJson.name).to.equal('@cybervinci/arena');
        expect(packageJson.theiaExtensions).to.deep.include({
            frontend: 'lib/browser/arena-frontend-module',
            backend: 'lib/node/arena-backend-module'
        });
    });

    it('is reachable from the shared CyberVinci menu without losing the View menu entry', () => {
        const contribution = readText('packages/arena/src/browser/arena-contribution.ts');
        expect(contribution).to.contain("from '@cybervinci/branding/lib/common'");
        expect(contribution).to.contain('CyberVinciMenus.ARENA');
        expect(contribution).to.contain('ArenaCommands.NEW_DUEL.id');
        expect(contribution).to.contain('CommonMenus.VIEW_VIEWS');
    });

    it('keeps sandbox cleanup guarded to avoid deleting user workspaces', () => {
        const sandboxService = readText('packages/arena/src/node/workspace-sandbox-service.ts');
        expect(sandboxService).to.contain('Refusing to remove Arena sandbox outside temp root');
        expect(sandboxService).to.contain('arena-');
    });

    it('keeps every advertised runner adapter represented by a node runner implementation', () => {
        for (const runner of [
            'api-llm-runner.ts',
            'codex-provider-runner.ts',
            'mock-runner.ts',
            'stub-runners.ts'
        ]) {
            expect(pathExists(`packages/arena/src/node/runners/${runner}`), runner).to.equal(true);
        }
        expect(readText('packages/arena/src/node/runner-registry.ts')).to.contain('Unknown Arena runner');
    });

    it('keeps the backend service and prompt library surfaces available for updates', () => {
        expect(pathExists('packages/arena/src/node/arena-service.ts')).to.equal(true);
        expect(pathExists('packages/arena/src/node/prompt-library-service.ts')).to.equal(true);
        expect(pathExists('packages/arena/src/browser/arena-widget.tsx')).to.equal(true);
    });
});

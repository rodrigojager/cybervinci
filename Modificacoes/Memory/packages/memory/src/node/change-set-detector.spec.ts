// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { ChangeSetDetector } from './change-set-detector';

describe('ChangeSetDetector', () => {

    it('falls back to file.edited events when git diff is unavailable', async () => {
        const result = await new NoGitChangeSetDetector().detect({
            workspacePath: '/workspace',
            events: [{
                id: 'event_1',
                workspacePath: '/workspace',
                eventType: 'file.edited',
                relativePath: 'src/service.ts',
                createdAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'event_2',
                workspacePath: '/workspace',
                eventType: 'file.edited',
                relativePath: 'src/service.ts',
                createdAt: '2026-01-01T00:00:01.000Z'
            }, {
                id: 'event_3',
                workspacePath: '/workspace',
                eventType: 'file.opened',
                relativePath: 'src/ignored.ts',
                createdAt: '2026-01-01T00:00:02.000Z'
            }]
        });

        expect(result.source).to.equal('file-events');
        expect(result.changedFilePaths).to.deep.equal(['src/service.ts']);
        expect(result.diagnostics).not.to.be.empty;
    });

    it('falls back to file creation, edit, deletion, and rename events when git diff is unavailable', async () => {
        const result = await new NoGitChangeSetDetector().detect({
            workspacePath: '/workspace',
            events: [{
                id: 'event_1',
                workspacePath: '/workspace',
                eventType: 'file.created',
                relativePath: 'src/created.ts',
                createdAt: '2026-01-01T00:00:00.000Z'
            }, {
                id: 'event_2',
                workspacePath: '/workspace',
                eventType: 'file.edited',
                relativePath: 'src/edited.ts',
                createdAt: '2026-01-01T00:00:01.000Z'
            }, {
                id: 'event_3',
                workspacePath: '/workspace',
                eventType: 'file.deleted',
                relativePath: 'src/deleted.ts',
                createdAt: '2026-01-01T00:00:02.000Z'
            }, {
                id: 'event_4',
                workspacePath: '/workspace',
                eventType: 'file.renamed',
                relativePath: 'src/renamed.ts',
                payload: JSON.stringify({ fromRelativePath: 'src/original.ts' }),
                createdAt: '2026-01-01T00:00:03.000Z'
            }, {
                id: 'event_5',
                workspacePath: '/other-workspace',
                eventType: 'file.created',
                relativePath: 'src/ignored.ts',
                createdAt: '2026-01-01T00:00:04.000Z'
            }]
        });

        expect(result.source).to.equal('file-events');
        expect(result.changedFilePaths).to.deep.equal([
            'src/created.ts',
            'src/deleted.ts',
            'src/edited.ts',
            'src/original.ts',
            'src/renamed.ts'
        ]);
    });
});

class NoGitChangeSetDetector extends ChangeSetDetector {

    protected override async gitDiff(_workspacePath: string, _args: string[]): Promise<string[]> {
        throw new Error('git unavailable');
    }
}

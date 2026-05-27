// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { CodexRemoteHostService } from './codex-remote-host-service';
import { CodexGlobalStateService } from './codex-support-services';

describe('CodexRemoteHostService', () => {
    let service: CodexRemoteHostService;
    let globalState: CodexGlobalStateService;

    beforeEach(() => {
        globalState = new CodexGlobalStateService();
        service = new CodexRemoteHostService();
        (service as unknown as { globalState: CodexGlobalStateService }).globalState = globalState;
    });

    it('stores and lists remote connections', () => {
        service.addConnection({
            params: {
                hostId: 'dev-box',
                label: 'Dev Box',
                sshHost: 'dev.example.com',
                sshUser: 'dev'
            }
        });
        const connections = service.listConnections();
        expect(connections).to.have.length(1);
        expect(connections[0].hostId).to.equal('dev-box');
    });

    it('parses ssh config host blocks', () => {
        const parsed = (service as unknown as {
            parseSshConfigFromContent(content: string): Array<{ host: string; hostname?: string }>;
        }).parseSshConfigFromContent([
            'Host dev-box',
            '  HostName dev.example.com',
            '  User dev',
            '  Port 2222'
        ].join('\n'));
        expect(parsed).to.deep.equal([{
            host: 'dev-box',
            hostname: 'dev.example.com',
            user: 'dev',
            port: 2222,
            identityFile: undefined
        }]);
    });
});

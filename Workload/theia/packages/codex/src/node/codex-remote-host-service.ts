// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import * as os from 'os';
import * as path from 'path';
import { parseCodexRpcParams } from '../common/codex-host-protocol';
import { CodexGlobalStateService } from './codex-support-services';

export interface CodexRemoteConnection {
    hostId: string;
    label: string;
    sshHost: string;
    sshUser?: string;
    sshPort?: number;
    identityFile?: string;
    status?: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export interface CodexDiscoveredRemoteConnection {
    host: string;
    hostname?: string;
    user?: string;
    port?: number;
    identityFile?: string;
}

@injectable()
export class CodexRemoteHostService {

    @inject(CodexGlobalStateService)
    protected readonly globalState: CodexGlobalStateService;

    listConnections(): CodexRemoteConnection[] {
        const stored = this.globalState.get('remote_connections');
        return Array.isArray(stored) ? stored as CodexRemoteConnection[] : [];
    }

    setConnections(connections: CodexRemoteConnection[]): void {
        this.globalState.set('remote_connections', connections);
    }

    async refreshConnections(): Promise<{ remoteConnections: CodexRemoteConnection[] }> {
        const connections = this.listConnections();
        return { remoteConnections: connections };
    }

    async refreshRemoteControlConnections(): Promise<{ remoteControlConnections: CodexRemoteConnection[] }> {
        const stored = this.globalState.get('remote_control_connections');
        const connections = Array.isArray(stored) ? stored as CodexRemoteConnection[] : [];
        return { remoteControlConnections: connections };
    }

    async discoverSshConnections(_params: unknown): Promise<{ discoveredRemoteConnections: CodexDiscoveredRemoteConnection[] }> {
        const discovered = await this.parseSshConfig();
        return { discoveredRemoteConnections: discovered };
    }

    async setRemoteControlConnectionsEnabled(_params: unknown): Promise<{ remoteControlConnectionsEnabled: boolean }> {
        return { remoteControlConnectionsEnabled: false };
    }

    addConnection(params: unknown): { connection: CodexRemoteConnection } {
        const record = parseCodexRpcParams(params);
        const hostId = typeof record.hostId === 'string'
            ? record.hostId
            : `ssh-${Date.now()}`;
        const connection: CodexRemoteConnection = {
            hostId,
            label: typeof record.label === 'string' ? record.label : hostId,
            sshHost: typeof record.sshHost === 'string' ? record.sshHost : hostId,
            sshUser: typeof record.sshUser === 'string' ? record.sshUser : undefined,
            sshPort: typeof record.sshPort === 'number' ? record.sshPort : undefined,
            identityFile: typeof record.identityFile === 'string' ? record.identityFile : undefined,
            status: 'disconnected'
        };
        const connections = this.listConnections();
        const existingIndex = connections.findIndex(entry => entry.hostId === hostId);
        if (existingIndex >= 0) {
            connections[existingIndex] = connection;
        } else {
            connections.push(connection);
        }
        this.setConnections(connections);
        return { connection };
    }

    protected async parseSshConfig(): Promise<CodexDiscoveredRemoteConnection[]> {
        const configPath = path.join(os.homedir(), '.ssh', 'config');
        if (!(await fs.pathExists(configPath))) {
            return [];
        }
        const content = await fs.readFile(configPath, 'utf8');
        return this.parseSshConfigFromContent(content);
    }

    protected parseSshConfigFromContent(content: string): CodexDiscoveredRemoteConnection[] {
        const discovered: CodexDiscoveredRemoteConnection[] = [];
        let currentHost: string | undefined;
        let hostname: string | undefined;
        let user: string | undefined;
        let port: number | undefined;
        let identityFile: string | undefined;

        const flush = (): void => {
            if (!currentHost || currentHost.includes('*')) {
                return;
            }
            discovered.push({
                host: currentHost,
                hostname,
                user,
                port,
                identityFile
            });
        };

        for (const rawLine of content.split('\n')) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) {
                continue;
            }
            const [key, ...rest] = line.split(/\s+/);
            const value = rest.join(' ').trim();
            const normalizedKey = key.toLowerCase();
            if (normalizedKey === 'host') {
                flush();
                currentHost = value;
                hostname = undefined;
                user = undefined;
                port = undefined;
                identityFile = undefined;
            } else if (normalizedKey === 'hostname') {
                hostname = value;
            } else if (normalizedKey === 'user') {
                user = value;
            } else if (normalizedKey === 'port') {
                const parsed = Number.parseInt(value, 10);
                port = Number.isFinite(parsed) ? parsed : undefined;
            } else if (normalizedKey === 'identityfile') {
                identityFile = value.replace(/^~/, os.homedir());
            }
        }
        flush();
        return discovered;
    }
}

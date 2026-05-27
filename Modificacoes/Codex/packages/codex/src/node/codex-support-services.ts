// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class CodexGlobalStateService {

    protected readonly store = new Map<string, unknown>();

    get(key: string): unknown {
        return this.store.get(key);
    }

    set(key: string, value: unknown): void {
        if (value === undefined) {
            this.store.delete(key);
            return;
        }
        this.store.set(key, value);
    }

    getSnapshot(): Record<string, unknown> {
        const snapshot: Record<string, unknown> = {};
        for (const [key, value] of this.store.entries()) {
            snapshot[key] = value;
        }
        return snapshot;
    }
}

@injectable()
export class CodexSharedObjectService {

    protected readonly values = new Map<string, unknown>();
    protected readonly subscribers = new Map<string, Set<string>>();

    subscribe(webviewId: string, key: string): void {
        const set = this.subscribers.get(key) ?? new Set<string>();
        set.add(webviewId);
        this.subscribers.set(key, set);
    }

    unsubscribe(webviewId: string, key: string): void {
        const set = this.subscribers.get(key);
        if (!set) {
            return;
        }
        set.delete(webviewId);
        if (set.size === 0) {
            this.subscribers.delete(key);
        }
    }

    set(key: string, value: unknown): void {
        this.values.set(key, value);
    }

    get(key: string): unknown {
        return this.values.get(key);
    }

    getSubscriberWebviewIds(key: string): readonly string[] {
        return [...(this.subscribers.get(key) ?? [])];
    }

    removeWebview(webviewId: string): void {
        for (const [key, set] of this.subscribers.entries()) {
            set.delete(webviewId);
            if (set.size === 0) {
                this.subscribers.delete(key);
            }
        }
    }
}

@injectable()
export class CodexWslPathService {

    translatePath(filePath: string, preferWsl: boolean): string {
        if (!preferWsl || process.platform !== 'win32') {
            return filePath;
        }
        if (filePath.startsWith('\\\\wsl$\\')) {
            return filePath;
        }
        const normalized = filePath.replace(/\\/g, '/');
        if (/^[a-zA-Z]:\//.test(normalized)) {
            const drive = normalized.charAt(0).toLowerCase();
            return `\\\\wsl$\\Ubuntu\\mnt\\${drive}${normalized.slice(2)}`;
        }
        return filePath;
    }
}

export interface CodexFileReadResult {
    content: string;
    encoding?: string;
}

@injectable()
export class CodexFileBridgeService {

    async readText(uriString: string): Promise<CodexFileReadResult> {
        const uri = new URI(uriString);
        const fsPath = FileUri.fsPath(uri);
        const content = await fs.readFile(fsPath, 'utf8');
        return { content, encoding: 'utf8' };
    }

    async readBinary(uriString: string): Promise<Uint8Array> {
        const uri = new URI(uriString);
        const fsPath = FileUri.fsPath(uri);
        const buffer = await fs.readFile(fsPath);
        return new Uint8Array(buffer);
    }

    async readMetadata(uriString: string): Promise<{ size: number; mtimeMs: number }> {
        const uri = new URI(uriString);
        const fsPath = FileUri.fsPath(uri);
        const stat = await fs.stat(fsPath);
        return { size: stat.size, mtimeMs: stat.mtimeMs ?? stat.mtime.getTime() };
    }

    async pathsExist(paths: string[]): Promise<string[]> {
        const existingPaths: string[] = [];
        for (const candidate of paths) {
            try {
                await fs.access(candidate);
                existingPaths.push(candidate);
            } catch {
                // path does not exist
            }
        }
        return existingPaths;
    }
}

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { FileUri } from '@theia/core/lib/common/file-uri';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common/preferences';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, optional, postConstruct } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CYBERVINCI_AI_CHAT_WORKDIR_PREF } from './cybervinci-ai-chat-experience-preferences';

export interface CyberVinciAiChatWorkdirUpdateOptions {
    readonly updateWorkspace?: boolean;
}

@injectable()
export class CyberVinciAiChatWorkdirService {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(WorkspaceService) @optional()
    protected readonly workspaceService: WorkspaceService | undefined;

    protected readonly onDidChangeWorkdirEmitter = new Emitter<URI | undefined>();
    protected readonly toDispose = new DisposableCollection(this.onDidChangeWorkdirEmitter);

    readonly onDidChangeWorkdir: Event<URI | undefined> = this.onDidChangeWorkdirEmitter.event;

    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_WORKDIR_PREF) {
                this.onDidChangeWorkdirEmitter.fire(this.getEffectiveWorkdirUri());
            }
        }));
        if (this.workspaceService) {
            this.toDispose.push(this.workspaceService.onWorkspaceChanged(() => {
                if (!this.getConfiguredWorkdirPath()) {
                    this.onDidChangeWorkdirEmitter.fire(this.getEffectiveWorkdirUri());
                }
            }));
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }

    getConfiguredWorkdirPath(): string | undefined {
        const configured = this.preferenceService.get<string>(CYBERVINCI_AI_CHAT_WORKDIR_PREF, undefined);
        return typeof configured === 'string' && configured.trim() ? configured.trim() : undefined;
    }

    getConfiguredWorkdirUri(): URI | undefined {
        const configured = this.getConfiguredWorkdirPath();
        if (!configured) {
            return undefined;
        }
        try {
            return FileUri.create(configured);
        } catch {
            return undefined;
        }
    }

    getEffectiveWorkdirUri(): URI | undefined {
        return this.getConfiguredWorkdirUri() ?? this.getWorkspaceRootUri();
    }

    getEffectiveWorkdirPath(): string | undefined {
        const uri = this.getEffectiveWorkdirUri();
        return uri ? FileUri.fsPath(uri) : undefined;
    }

    getWorkspaceRootUri(): URI | undefined {
        return this.workspaceService?.tryGetRoots()[0]?.resource ?? this.workspaceService?.workspace?.resource;
    }

    async listChildDirectories(uri: URI): Promise<FileStat[]> {
        const stat = await this.fileService.resolve(uri);
        return (stat.children ?? [])
            .filter(child => child.isDirectory)
            .sort((left, right) => left.resource.path.base.localeCompare(right.resource.path.base));
    }

    async ensureDirectory(uri: URI): Promise<FileStat> {
        const stat = await this.fileService.resolve(uri);
        if (!stat.isDirectory) {
            throw new Error(`${FileUri.fsPath(uri)} is not a directory.`);
        }
        return stat;
    }

    async setWorkdir(uri: URI, options: CyberVinciAiChatWorkdirUpdateOptions = {}): Promise<void> {
        await this.ensureDirectory(uri);
        await this.preferenceService.set(CYBERVINCI_AI_CHAT_WORKDIR_PREF, FileUri.fsPath(uri), PreferenceScope.User);
        this.onDidChangeWorkdirEmitter.fire(uri);
        if (options.updateWorkspace && this.workspaceService) {
            this.workspaceService.open(uri, { preserveWindow: true });
        }
    }

    async clearWorkdir(): Promise<void> {
        await this.preferenceService.set(CYBERVINCI_AI_CHAT_WORKDIR_PREF, undefined, PreferenceScope.User);
        this.onDidChangeWorkdirEmitter.fire(this.getEffectiveWorkdirUri());
    }
}

// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { StorageService } from '@theia/core/lib/browser/storage-service';
import { inject, injectable } from '@theia/core/shared/inversify';

export const CyberVinciChatGoalStore = Symbol('CyberVinciChatGoalStore');

export interface CyberVinciChatGoalStore {
    getThreadGoal(threadId: string): Promise<unknown | undefined>;
    setThreadGoal(threadId: string, goal: unknown): Promise<void>;
    clearThreadGoal(threadId: string): Promise<void>;
}

const CYBERVINCI_CHAT_GOAL_STORAGE_PREFIX = 'cybervinci.aiChat.goal.';

@injectable()
export class CyberVinciStorageChatGoalStore implements CyberVinciChatGoalStore {

    @inject(StorageService)
    protected readonly storageService: StorageService;

    getThreadGoal(threadId: string): Promise<unknown | undefined> {
        return this.storageService.getData<unknown>(this.storageKey(threadId));
    }

    async setThreadGoal(threadId: string, goal: unknown): Promise<void> {
        await this.storageService.setData(this.storageKey(threadId), goal);
    }

    async clearThreadGoal(threadId: string): Promise<void> {
        await this.storageService.setData(this.storageKey(threadId), undefined);
    }

    protected storageKey(threadId: string): string {
        return `${CYBERVINCI_CHAT_GOAL_STORAGE_PREFIX}${threadId}`;
    }
}

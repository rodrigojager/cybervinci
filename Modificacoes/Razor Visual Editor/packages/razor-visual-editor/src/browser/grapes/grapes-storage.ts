import type { Editor } from 'grapesjs';

interface StorageManagerLike {
    add(type: string, storage: {
        load(keys?: string[]): Promise<Record<string, unknown>>;
        store(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    }): void;
}

interface StorageAwareEditor {
    Storage?: StorageManagerLike;
}

export function registerCyberVinciGrapesStorage(editor: Editor): void {
    const storage = (editor as unknown as StorageAwareEditor).Storage;
    if (!storage) {
        return;
    }
    storage.add('cybervinci-file-storage', {
        async load(): Promise<Record<string, unknown>> {
            return {};
        },
        async store(data: Record<string, unknown>): Promise<Record<string, unknown>> {
            return data;
        }
    });
}

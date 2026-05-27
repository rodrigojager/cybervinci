import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import { Builder_FILE_EXTENSION, BUILDER_FILE_EXTENSIONS, isBuilderFileName } from '../common';

export interface BuilderFilePersistenceService {
    writeFile(resource: URI, content: BinaryBuffer): Promise<unknown>;
    stat?(resource: URI): Promise<BuilderFileStat>;
    resolve?(resource: URI, options?: { resolveMetadata?: boolean }): Promise<BuilderFileStat>;
    move?(source: URI, target: URI, options?: { overwrite?: boolean; fromUserGesture?: boolean }): Promise<unknown>;
    delete?(resource: URI, options?: { recursive?: boolean; fromUserGesture?: boolean }): Promise<unknown>;
}

export interface BuilderFileStat {
    mtime?: number;
    size?: number;
    etag?: string;
}

export interface BuilderFileVersion {
    mtime?: number;
    size?: number;
    etag?: string;
}

export interface BuilderPersistFileOptions {
    atomic?: boolean;
    expectedVersion?: BuilderFileVersion;
}

export interface BuilderTextDiffSummary {
    added: number;
    removed: number;
    changed: boolean;
    preview: string;
}

export class BuilderSaveConflictError extends Error {
    constructor(readonly target: URI, readonly expectedVersion: BuilderFileVersion, readonly actualVersion: BuilderFileVersion) {
        super(`Cannot save ${target.path.base} because the file changed on disk after it was opened.`);
        this.name = 'BuilderSaveConflictError';
    }
}

export function createBuilderTextDiffSummary(memoryText: string, diskText: string, options: { maxLines?: number } = {}): BuilderTextDiffSummary {
    const maxLines = options.maxLines ?? 12;
    const memoryLines = splitDiffLines(memoryText);
    const diskLines = splitDiffLines(diskText);
    const table = createLcsTable(memoryLines, diskLines);
    const diffLines: string[] = [];
    let added = 0;
    let removed = 0;
    let i = 0;
    let j = 0;

    while (i < memoryLines.length || j < diskLines.length) {
        if (i < memoryLines.length && j < diskLines.length && memoryLines[i] === diskLines[j]) {
            i++;
            j++;
        } else if (j < diskLines.length && (i === memoryLines.length || table[i][j + 1] >= table[i + 1][j])) {
            added++;
            if (diffLines.length < maxLines) {
                diffLines.push(`+ ${diskLines[j]}`);
            }
            j++;
        } else if (i < memoryLines.length) {
            removed++;
            if (diffLines.length < maxLines) {
                diffLines.push(`- ${memoryLines[i]}`);
            }
            i++;
        }
    }

    const omitted = added + removed - diffLines.length;
    if (omitted > 0) {
        diffLines.push(`... ${omitted} more changed line${omitted === 1 ? '' : 's'}`);
    }

    return {
        added,
        removed,
        changed: added > 0 || removed > 0,
        preview: diffLines.join('\n')
    };
}

export async function persistBuilderJsonFile(
    fileService: BuilderFilePersistenceService,
    target: URI,
    json: string,
    options: BuilderPersistFileOptions = {}
): Promise<void> {
    if (!isBuilderFileName(target.path.toString())) {
        throw new Error(`Builder documents must be saved with one of these extensions: ${BUILDER_FILE_EXTENSIONS.join(', ')}.`);
    }

    await assertExpectedFileVersion(fileService, target, options.expectedVersion);

    const content = BinaryBuffer.fromString(json);
    if (options.atomic === false || !fileService.move) {
        await fileService.writeFile(target, content);
        return;
    }

    const temp = target.parent.resolve(`.${target.path.base}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    try {
        await fileService.writeFile(temp, content);
        await fileService.move(temp, target, { overwrite: true, fromUserGesture: false });
    } catch (error) {
        await deleteTempFile(fileService, temp);
        await fileService.writeFile(target, content);
    }
}

export function createBuilderCopyUri(target: URI, timestamp = new Date()): URI {
    const extension = Builder_FILE_EXTENSION;
    const base = target.path.base;
    const stem = base.endsWith(extension) ? base.slice(0, -extension.length) : base;
    const stamp = timestamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return target.parent.resolve(`${stem}.copy-${stamp}${extension}`);
}

export function toBuilderFileVersion(stat: BuilderFileStat): BuilderFileVersion {
    return {
        mtime: stat.mtime,
        size: stat.size,
        etag: stat.etag
    };
}

async function assertExpectedFileVersion(fileService: BuilderFilePersistenceService, target: URI, expectedVersion: BuilderFileVersion | undefined): Promise<void> {
    if (!expectedVersion || (!fileService.stat && !fileService.resolve)) {
        return;
    }

    const actualVersion = toBuilderFileVersion(fileService.stat
        ? await fileService.stat(target)
        : await fileService.resolve!(target, { resolveMetadata: true }));
    if (!sameFileVersion(expectedVersion, actualVersion)) {
        throw new BuilderSaveConflictError(target, expectedVersion, actualVersion);
    }
}

function sameFileVersion(expected: BuilderFileVersion, actual: BuilderFileVersion): boolean {
    if (expected.etag !== undefined || actual.etag !== undefined) {
        return expected.etag === actual.etag;
    }
    return expected.mtime === actual.mtime && expected.size === actual.size;
}

async function deleteTempFile(fileService: BuilderFilePersistenceService, temp: URI): Promise<void> {
    if (!fileService.delete) {
        return;
    }
    try {
        await fileService.delete(temp, { recursive: false, fromUserGesture: false });
    } catch {
        // Best effort cleanup only; persistence falls back to a direct write.
    }
}

function splitDiffLines(text: string): string[] {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function createLcsTable(left: string[], right: string[]): number[][] {
    const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
    for (let i = left.length - 1; i >= 0; i--) {
        for (let j = right.length - 1; j >= 0; j--) {
            table[i][j] = left[i] === right[j]
                ? table[i + 1][j + 1] + 1
                : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }
    return table;
}

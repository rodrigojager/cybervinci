import { RazorSourceMap, RazorToken } from '../types/razor-token';

export function stableHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createRazorSourceMap(filePath: string, original: string, processed: string, tokens: RazorToken[]): RazorSourceMap {
    return {
        filePath,
        originalHash: stableHash(original),
        processedHash: stableHash(processed),
        tokens,
        createdAt: new Date().toISOString()
    };
}

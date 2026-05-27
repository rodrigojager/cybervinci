// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryCodeChunk, MemoryEvent, MemoryItem } from './memory-types';
import { SecretScanner } from './secret-scanner';

export const MEMORY_LOCAL_VECTOR_MODEL_ID = 'pi-local-hash-embedding-v1';
export const MEMORY_LOCAL_VECTOR_DIMENSIONS = 64;

export interface MemoryEmbeddingRequest {
    text: string;
    dimensions?: number;
}

export interface MemoryEmbeddableContent {
    title?: string;
    content: string;
    source?: string;
    isSensitive?: boolean;
}

export interface MemoryEmbedding {
    modelId: string;
    dimensions: number;
    vector: number[];
}

export class MemoryVectorService {

    readonly modelId = MEMORY_LOCAL_VECTOR_MODEL_ID;
    readonly defaultDimensions = MEMORY_LOCAL_VECTOR_DIMENSIONS;
    protected readonly secretScanner = new SecretScanner();

    embedText(request: MemoryEmbeddingRequest): MemoryEmbedding {
        const dimensions = this.normalizeDimensions(request.dimensions);
        const vector = new Array<number>(dimensions).fill(0);
        const terms = this.terms(request.text);
        if (!terms.length) {
            return { modelId: this.modelId, dimensions, vector };
        }
        for (let index = 0; index < terms.length; index++) {
            this.addTerm(vector, terms[index], 1);
            if (index > 0) {
                this.addTerm(vector, `${terms[index - 1]} ${terms[index]}`, 0.45);
            }
        }
        return {
            modelId: this.modelId,
            dimensions,
            vector: this.normalizeVector(vector)
        };
    }

    embedMemory(memory: Pick<MemoryItem, 'title' | 'content' | 'memoryType' | 'importance'>, dimensions?: number): MemoryEmbedding {
        const text = this.memoryContent(memory);
        this.assertEmbeddable(text, 'memory');
        return this.embedText({ text, dimensions });
    }

    embedDocument(document: MemoryEmbeddableContent, dimensions?: number): MemoryEmbedding {
        const text = [document.title ?? '', document.content, document.source ?? ''].join('\n');
        this.assertEmbeddable(text, 'document', document.isSensitive);
        return this.embedText({
            text,
            dimensions
        });
    }

    embedCodeChunk(chunk: Pick<MemoryCodeChunk, 'title' | 'content' | 'relativePath'> & { isSensitive?: boolean }, dimensions?: number): MemoryEmbedding {
        const text = [chunk.title, chunk.content, chunk.relativePath].join('\n');
        this.assertEmbeddable(text, 'code chunk', chunk.isSensitive);
        return this.embedText({ text, dimensions });
    }

    embedTranscript(event: Pick<MemoryEvent, 'eventType' | 'payload' | 'relativePath'> & { isSensitive?: boolean }, dimensions?: number): MemoryEmbedding {
        const text = [event.eventType, event.relativePath ?? '', event.payload ?? ''].join('\n');
        this.assertEmbeddable(text, 'transcript', event.isSensitive);
        return this.embedText({ text, dimensions });
    }

    cosineSimilarity(left: readonly number[], right: readonly number[]): number {
        const length = Math.min(left.length, right.length);
        if (!length) {
            return 0;
        }
        let dot = 0;
        let leftNorm = 0;
        let rightNorm = 0;
        for (let index = 0; index < length; index++) {
            dot += left[index] * right[index];
            leftNorm += left[index] * left[index];
            rightNorm += right[index] * right[index];
        }
        if (!leftNorm || !rightNorm) {
            return 0;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }

    contentHash(value: string): string {
        return this.hash(value).toString(16);
    }

    memoryContent(memory: Pick<MemoryItem, 'title' | 'content' | 'memoryType' | 'importance'>): string {
        return [memory.title, memory.content, memory.memoryType, memory.importance].join('\n');
    }

    canEmbedContent(content: MemoryEmbeddableContent): boolean {
        return !content.isSensitive && !this.containsSecret([content.title ?? '', content.content, content.source ?? ''].join('\n'));
    }

    normalizeDimensions(dimensions: number | undefined): number {
        if (!dimensions || !Number.isFinite(dimensions)) {
            return this.defaultDimensions;
        }
        return Math.min(Math.max(Math.floor(dimensions), 16), 512);
    }

    protected addTerm(vector: number[], term: string, weight: number): void {
        const hash = this.hash(term);
        const index = hash % vector.length;
        const sign = (hash & 0x80000000) === 0 ? 1 : -1;
        vector[index] += sign * weight;
    }

    protected terms(text: string): string[] {
        return text.toLowerCase().match(/[a-z0-9_.$#-]{2,}/g)?.slice(0, 512) ?? [];
    }

    protected normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
        if (!magnitude) {
            return vector;
        }
        return vector.map(value => Number((value / magnitude).toFixed(8)));
    }

    protected assertEmbeddable(text: string, label: string, isSensitive?: boolean): void {
        if (isSensitive || this.containsSecret(text)) {
            throw new Error(`Memory refused to embed sensitive ${label} content.`);
        }
    }

    protected containsSecret(text: string): boolean {
        return this.secretScanner.scan({ content: text, maxFindings: 1 }).findings.length > 0;
    }

    protected hash(value: string): number {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
}

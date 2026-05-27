// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import {
    MemoryCodeChunk,
    MemoryCodeChunkKind,
    MemoryExternalDocCollectionPolicy,
    MemoryFile,
    MemorySymbol
} from '../common';
import { SecretRedactionService } from '../common/secret-redaction';

const MAX_FILE_BYTES = 256_000;
const FALLBACK_CHUNK_LINES = 120;
const MIN_CHUNK_CHARS = 24;

export interface FileContentIndexerOptions {
    includePdfDocuments?: boolean;
    includeOfficeDocuments?: boolean;
    includeImages?: boolean;
    includeDiagrams?: boolean;
    includeAudioVideo?: boolean;
    allowRemoteImageSemantics?: boolean;
    allowRemoteMediaTranscription?: boolean;
}

export class FileContentIndexer {

    protected readonly redactionService = new SecretRedactionService();

    async indexWorkspace(
        workspacePath: string,
        files: MemoryFile[],
        symbols: MemorySymbol[],
        indexedAt: string,
        options: FileContentIndexerOptions = {}
    ): Promise<MemoryCodeChunk[]> {
        const chunks: MemoryCodeChunk[] = [];
        const symbolsByFile = new Map<string, MemorySymbol[]>();
        for (const symbol of symbols) {
            const existing = symbolsByFile.get(symbol.fileId) ?? [];
            existing.push(symbol);
            symbolsByFile.set(symbol.fileId, existing);
        }
        for (const file of files) {
            chunks.push(...await this.indexFile(workspacePath, file, symbolsByFile.get(file.id) ?? [], indexedAt, options));
        }
        return chunks;
    }

    async indexExternalDocCollection(
        workspacePath: string,
        collection: MemoryExternalDocCollectionPolicy,
        indexedAt: string
    ): Promise<MemoryCodeChunk[]> {
        if (!collection.enabled) {
            return [];
        }
        const root = path.resolve(collection.rootPath);
        const files = await this.collectExternalDocFiles(root, collection);
        const chunks: MemoryCodeChunk[] = [];
        for (const file of files.slice(0, collection.maxFiles ?? 100)) {
            const relativePath = path.relative(root, file.absolutePath).replace(/\\/g, '/');
            const virtualFile: MemoryFile = {
                id: `external_file_${this.hash(`${collection.id}:${root}:${relativePath}`).slice(0, 24)}`,
                relativePath: `external-docs/${collection.id}/${relativePath}`,
                fileName: path.basename(file.absolutePath),
                extension: path.extname(file.absolutePath).toLowerCase(),
                languageId: this.languageId(path.extname(file.absolutePath).toLowerCase()),
                sizeBytes: file.sizeBytes,
                contentHash: file.contentHash,
                isIgnored: false,
                isGenerated: false,
                isBinary: false,
                isSensitive: false,
                indexedAt
            };
            const text = this.redactionService.redactText(file.content) ?? '';
            const docChunks = this.externalTextChunks(workspacePath, virtualFile, text, indexedAt, collection, relativePath);
            chunks.push(...docChunks);
        }
        return this.dedupe(chunks);
    }

    protected async indexFile(
        workspacePath: string,
        file: MemoryFile,
        symbols: MemorySymbol[],
        indexedAt: string,
        options: FileContentIndexerOptions
    ): Promise<MemoryCodeChunk[]> {
        if (file.isIgnored || file.isSensitive || file.sizeBytes > MAX_FILE_BYTES) {
            return [];
        }
        const absolutePath = this.safeFilePath(workspacePath, file.relativePath);
        if (!absolutePath) {
            return [];
        }
        if (file.extension === '.pdf') {
            return options.includePdfDocuments === true ? this.pdfChunks(workspacePath, file, absolutePath, indexedAt) : [];
        }
        if (this.isOfficeDocument(file.extension)) {
            return options.includeOfficeDocuments === true ? this.officeDocumentChunks(workspacePath, file, absolutePath, indexedAt) : [];
        }
        if (this.isImageDocument(file.extension)) {
            return options.includeImages === true ? this.imageMetadataChunks(workspacePath, file, absolutePath, indexedAt, options) : [];
        }
        if (this.isDiagramDocument(file.extension)) {
            return options.includeDiagrams === true ? this.diagramDocumentChunks(workspacePath, file, absolutePath, indexedAt) : [];
        }
        if (this.isAudioVideoDocument(file.extension)) {
            return options.includeAudioVideo === true ? this.mediaDocumentChunks(workspacePath, file, absolutePath, indexedAt, options) : [];
        }
        if (file.isBinary) {
            return [];
        }
        let content = '';
        try {
            content = await fs.readFile(absolutePath, 'utf8');
        } catch {
            return [];
        }
        const lines = content.split(/\r?\n/);
        const chunks = [
            ...this.symbolChunks(workspacePath, file, content, lines, symbols, indexedAt),
            ...this.structuredChunks(workspacePath, file, content, lines, indexedAt)
        ];
        if (chunks.length) {
            return this.dedupe(chunks);
        }
        return this.fallbackChunks(workspacePath, file, lines, indexedAt);
    }

    protected async pdfChunks(workspacePath: string, file: MemoryFile, absolutePath: string, indexedAt: string): Promise<MemoryCodeChunk[]> {
        let buffer: Buffer;
        try {
            buffer = await fs.readFile(absolutePath);
        } catch {
            return [];
        }
        if (!buffer.subarray(0, 8).toString('latin1').startsWith('%PDF-')) {
            return [];
        }
        let text = '';
        try {
            text = this.extractPdfText(buffer);
        } catch {
            return [];
        }
        if (!text) {
            return [];
        }
        const redactedText = this.redactionService.redactText(text) ?? '';
        const pages = redactedText.split(/\f+/).map(page => page.trim()).filter(Boolean);
        const sourcePages = pages.length ? pages : [redactedText];
        return sourcePages.flatMap((page, index) => this.textPageChunks(workspacePath, file, page, index + 1, indexedAt));
    }

    protected async officeDocumentChunks(workspacePath: string, file: MemoryFile, absolutePath: string, indexedAt: string): Promise<MemoryCodeChunk[]> {
        let buffer: Buffer;
        try {
            buffer = await fs.readFile(absolutePath);
        } catch {
            return [];
        }
        let text = '';
        try {
            text = this.extractOfficeText(buffer, file.extension);
        } catch {
            return [];
        }
        if (!text) {
            return [];
        }
        const redactedText = this.redactionService.redactText(text) ?? '';
        return this.textDocumentChunks(workspacePath, file, redactedText, indexedAt);
    }

    protected async imageMetadataChunks(
        workspacePath: string,
        file: MemoryFile,
        absolutePath: string,
        indexedAt: string,
        options: FileContentIndexerOptions
    ): Promise<MemoryCodeChunk[]> {
        let buffer: Buffer;
        try {
            buffer = await fs.readFile(absolutePath);
        } catch {
            return [];
        }
        let dimensions: { width: number; height: number } | undefined;
        try {
            dimensions = this.imageDimensions(buffer, file.extension);
        } catch {
            dimensions = undefined;
        }
        const content = [
            `Image file: ${file.relativePath}`,
            `Media type: ${this.imageMediaType(file.extension)}`,
            dimensions ? `Dimensions: ${dimensions.width}x${dimensions.height}` : undefined,
            `Size bytes: ${file.sizeBytes}`,
            'OCR: disabled',
            options.allowRemoteImageSemantics === true
                ? 'Remote semantics: consent recorded but no remote image semantic provider is invoked by this local indexer'
                : 'Remote semantics: disabled'
        ].filter((line): line is string => !!line).join('\n');
        const chunk = this.createChunk({
            workspacePath,
            file,
            chunkKind: 'image-metadata',
            title: file.relativePath,
            content,
            startLine: 1,
            endLine: 1,
            indexedAt,
            stablePart: `image:${file.contentHash}:${dimensions?.width ?? 0}:${dimensions?.height ?? 0}`
        });
        return chunk ? [chunk] : [];
    }

    protected async diagramDocumentChunks(workspacePath: string, file: MemoryFile, absolutePath: string, indexedAt: string): Promise<MemoryCodeChunk[]> {
        let content = '';
        try {
            content = await fs.readFile(absolutePath, 'utf8');
        } catch {
            return [];
        }
        const text = this.redactionService.redactText(this.extractDiagramText(content, file.extension)) ?? '';
        if (!text.trim()) {
            return [];
        }
        return this.textDiagramChunks(workspacePath, file, text, indexedAt);
    }

    protected async mediaDocumentChunks(
        workspacePath: string,
        file: MemoryFile,
        absolutePath: string,
        indexedAt: string,
        options: FileContentIndexerOptions
    ): Promise<MemoryCodeChunk[]> {
        const transcript = await this.localMediaTranscript(absolutePath);
        if (transcript) {
            const redactedTranscript = this.redactionService.redactText(transcript) ?? '';
            const transcriptChunks = this.textMediaTranscriptChunks(workspacePath, file, redactedTranscript, indexedAt);
            if (transcriptChunks.length) {
                return transcriptChunks;
            }
        }
        const content = [
            `Media file: ${file.relativePath}`,
            `Media type: ${this.mediaType(file.extension)}`,
            `Size bytes: ${file.sizeBytes}`,
            'Transcription origin: none',
            'Transcription confidence: 0',
            options.allowRemoteMediaTranscription === true
                ? 'Remote transcription: consent recorded but no remote transcription provider is invoked by this local indexer'
                : 'Remote transcription: disabled'
        ].join('\n');
        const chunk = this.createChunk({
            workspacePath,
            file,
            chunkKind: 'media-metadata',
            title: file.relativePath,
            content,
            startLine: 1,
            endLine: 1,
            indexedAt,
            stablePart: `media:${file.contentHash}:metadata`
        });
        return chunk ? [chunk] : [];
    }

    protected async localMediaTranscript(absolutePath: string): Promise<string | undefined> {
        for (const transcriptPath of this.mediaTranscriptCandidates(absolutePath)) {
            try {
                const stat = await fs.stat(transcriptPath);
                if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
                    continue;
                }
                const content = await fs.readFile(transcriptPath, 'utf8');
                const text = this.extractTranscriptText(content, path.extname(transcriptPath).toLowerCase());
                if (text.trim()) {
                    return text;
                }
            } catch {
                // Try the next conventional sidecar transcript name.
            }
        }
        return undefined;
    }

    protected mediaTranscriptCandidates(absolutePath: string): string[] {
        const parsed = path.parse(absolutePath);
        const base = path.join(parsed.dir, parsed.name);
        return ['.transcript.txt', '.txt', '.vtt', '.srt'].map(extension => `${base}${extension}`);
    }

    protected extractTranscriptText(content: string, extension: string): string {
        const lines = content.split(/\r?\n/);
        if (extension === '.vtt' || extension === '.srt') {
            return lines
                .map(line => line.trim())
                .filter(line => line && line !== 'WEBVTT' && !/^\d+$/.test(line) && !/^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(line))
                .join('\n');
        }
        return content;
    }

    protected textDiagramChunks(workspacePath: string, file: MemoryFile, text: string, indexedAt: string): MemoryCodeChunk[] {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (!lines.length) {
            return [];
        }
        const chunks: MemoryCodeChunk[] = [];
        for (let start = 1; start <= lines.length; start += FALLBACK_CHUNK_LINES) {
            const end = Math.min(lines.length, start + FALLBACK_CHUNK_LINES - 1);
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind: 'diagram-document',
                title: lines.length > FALLBACK_CHUNK_LINES ? `${file.relativePath} lines ${start}-${end}` : file.relativePath,
                content: this.sliceLines(lines, start, end),
                startLine: start,
                endLine: end,
                indexedAt,
                stablePart: `diagram:${start}:${end}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    protected textMediaTranscriptChunks(workspacePath: string, file: MemoryFile, text: string, indexedAt: string): MemoryCodeChunk[] {
        const transcriptLines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const lines = [
            'Transcription origin: local-sidecar',
            'Transcription confidence: 0.90',
            ...transcriptLines
        ];
        const chunks: MemoryCodeChunk[] = [];
        for (let start = 1; start <= lines.length; start += FALLBACK_CHUNK_LINES) {
            const end = Math.min(lines.length, start + FALLBACK_CHUNK_LINES - 1);
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind: 'media-transcript',
                title: lines.length > FALLBACK_CHUNK_LINES ? `${file.relativePath} transcript lines ${start}-${end}` : `${file.relativePath} transcript`,
                content: this.sliceLines(lines, start, end),
                startLine: start,
                endLine: end,
                indexedAt,
                stablePart: `media-transcript:${start}:${end}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    protected textDocumentChunks(workspacePath: string, file: MemoryFile, text: string, indexedAt: string): MemoryCodeChunk[] {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (!lines.length) {
            return [];
        }
        const chunks: MemoryCodeChunk[] = [];
        for (let start = 1; start <= lines.length; start += FALLBACK_CHUNK_LINES) {
            const end = Math.min(lines.length, start + FALLBACK_CHUNK_LINES - 1);
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind: 'office-document',
                title: lines.length > FALLBACK_CHUNK_LINES ? `${file.relativePath} lines ${start}-${end}` : file.relativePath,
                content: this.sliceLines(lines, start, end),
                startLine: start,
                endLine: end,
                indexedAt,
                stablePart: `office:${start}:${end}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    protected textPageChunks(workspacePath: string, file: MemoryFile, page: string, pageNumber: number, indexedAt: string): MemoryCodeChunk[] {
        const lines = page.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (!lines.length) {
            return [];
        }
        const chunks: MemoryCodeChunk[] = [];
        for (let start = 1; start <= lines.length; start += FALLBACK_CHUNK_LINES) {
            const end = Math.min(lines.length, start + FALLBACK_CHUNK_LINES - 1);
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind: 'pdf-page',
                title: `${file.relativePath} page ${pageNumber}${lines.length > FALLBACK_CHUNK_LINES ? ` lines ${start}-${end}` : ''}`,
                content: this.sliceLines(lines, start, end),
                startLine: pageNumber,
                endLine: pageNumber,
                indexedAt,
                stablePart: `pdf:${pageNumber}:${start}:${end}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    protected extractPdfText(buffer: Buffer): string {
        const raw = buffer.toString('latin1');
        const streamTexts: string[] = [];
        const streamPattern = /(?:<<[\s\S]*?>>\s*)?stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let match: RegExpExecArray | null;
        while ((match = streamPattern.exec(raw)) !== null) {
            const stream = match[1];
            const decoded = this.decodePdfTextStream(Buffer.from(stream, 'latin1'));
            if (decoded) {
                streamTexts.push(decoded);
            }
        }
        const fallback = this.decodePdfTextStream(buffer);
        return [...streamTexts, fallback].filter(Boolean).join('\n\f\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    protected decodePdfTextStream(buffer: Buffer): string {
        const candidates = [buffer, this.inflate(buffer)].filter((candidate): candidate is Buffer => !!candidate);
        const parts: string[] = [];
        for (const candidate of candidates) {
            const text = candidate.toString('latin1');
            for (const literal of this.pdfStringLiterals(text)) {
                const decoded = this.decodePdfLiteral(literal);
                if (/[A-Za-z0-9][A-Za-z0-9 ]{8,}/.test(decoded)) {
                    parts.push(decoded);
                }
            }
            for (const hex of text.matchAll(/<([0-9A-Fa-f]{8,})>/g)) {
                const decoded = this.decodePdfHexString(hex[1]);
                if (/[A-Za-z0-9][A-Za-z0-9 ]{8,}/.test(decoded)) {
                    parts.push(decoded);
                }
            }
        }
        return parts.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
    }

    protected inflate(buffer: Buffer): Buffer | undefined {
        try {
            return zlib.inflateSync(buffer);
        } catch {
            return undefined;
        }
    }

    protected pdfStringLiterals(text: string): string[] {
        const literals: string[] = [];
        let depth = 0;
        let start = -1;
        let escaped = false;
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '(') {
                if (depth === 0) {
                    start = index + 1;
                }
                depth++;
            } else if (char === ')' && depth > 0) {
                depth--;
                if (depth === 0 && start !== -1) {
                    literals.push(text.slice(start, index));
                    start = -1;
                }
            }
        }
        return literals;
    }

    protected decodePdfLiteral(value: string): string {
        return value
            .replace(/\\([nrtbf()\\])/g, (_match, escaped: string) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[escaped] ?? escaped))
            .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)))
            .replace(/\\\r?\n/g, '')
            .replace(/[^\S\r\n]+/g, ' ')
            .trim();
    }

    protected decodePdfHexString(value: string): string {
        const bytes = value.match(/.{1,2}/g)?.map(hex => parseInt(hex, 16)).filter(byte => Number.isFinite(byte)) ?? [];
        const withoutBom = bytes[0] === 0xfe && bytes[1] === 0xff ? bytes.slice(2) : bytes;
        if (bytes[0] === 0xfe && bytes[1] === 0xff) {
            const chars: string[] = [];
            for (let index = 0; index + 1 < withoutBom.length; index += 2) {
                chars.push(String.fromCharCode((withoutBom[index] << 8) + withoutBom[index + 1]));
            }
            return chars.join('').trim();
        }
        return Buffer.from(withoutBom).toString('utf8').trim();
    }

    protected extractOfficeText(buffer: Buffer, extension: string | undefined): string {
        const entries = this.zipTextEntries(buffer);
        const selected = entries
            .filter(entry => this.isOfficeTextEntry(extension, entry.name))
            .sort((left, right) => left.name.localeCompare(right.name));
        return selected
            .map(entry => this.xmlText(entry.content))
            .filter(Boolean)
            .join('\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    protected zipTextEntries(buffer: Buffer): Array<{ name: string; content: string }> {
        const entries: Array<{ name: string; content: string }> = [];
        let offset = 0;
        while (offset + 30 <= buffer.length) {
            if (buffer.readUInt32LE(offset) !== 0x04034b50) {
                offset++;
                continue;
            }
            const compression = buffer.readUInt16LE(offset + 8);
            const compressedSize = buffer.readUInt32LE(offset + 18);
            const fileNameLength = buffer.readUInt16LE(offset + 26);
            const extraLength = buffer.readUInt16LE(offset + 28);
            const nameStart = offset + 30;
            const dataStart = nameStart + fileNameLength + extraLength;
            const dataEnd = dataStart + compressedSize;
            if (dataEnd > buffer.length || fileNameLength <= 0) {
                break;
            }
            const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8').replace(/\\/g, '/');
            if (name.endsWith('.xml')) {
                const payload = buffer.subarray(dataStart, dataEnd);
                const decoded = this.decodeZipPayload(payload, compression);
                if (decoded) {
                    entries.push({ name, content: decoded.toString('utf8') });
                }
            }
            offset = dataEnd;
        }
        return entries;
    }

    protected decodeZipPayload(payload: Buffer, compression: number): Buffer | undefined {
        if (compression === 0) {
            return payload;
        }
        if (compression === 8) {
            try {
                return zlib.inflateRawSync(payload);
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    protected isOfficeTextEntry(extension: string | undefined, name: string): boolean {
        switch (extension) {
            case '.docx':
                return name === 'word/document.xml' || name.startsWith('word/header') || name.startsWith('word/footer');
            case '.pptx':
                return /^ppt\/slides\/slide\d+\.xml$/.test(name) || name === 'ppt/notesMasters/notesMaster1.xml';
            case '.xlsx':
                return name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(name);
            default:
                return false;
        }
    }

    protected xmlText(xml: string): string {
        return xml
            .replace(/<[^>]+>/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/[^\S\r\n]+/g, ' ')
            .split(/\r?\n| {2,}/)
            .map(part => part.trim())
            .filter(part => /[A-Za-z0-9][A-Za-z0-9 ]{2,}/.test(part))
            .join('\n')
            .trim();
    }

    protected isOfficeDocument(extension: string | undefined): boolean {
        return extension === '.docx' || extension === '.pptx' || extension === '.xlsx';
    }

    protected isImageDocument(extension: string | undefined): boolean {
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico'].includes(extension ?? '');
    }

    protected isDiagramDocument(extension: string | undefined): boolean {
        return ['.svg', '.drawio', '.mermaid', '.mmd', '.puml', '.plantuml'].includes(extension ?? '');
    }

    protected isAudioVideoDocument(extension: string | undefined): boolean {
        return ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(extension ?? '');
    }

    protected mediaType(extension: string | undefined): string {
        switch (extension) {
            case '.mp4':
                return 'video/mp4';
            case '.mov':
                return 'video/quicktime';
            case '.mkv':
                return 'video/x-matroska';
            case '.webm':
                return 'video/webm';
            case '.avi':
                return 'video/x-msvideo';
            case '.wav':
                return 'audio/wav';
            case '.m4a':
                return 'audio/mp4';
            case '.aac':
                return 'audio/aac';
            case '.flac':
                return 'audio/flac';
            case '.ogg':
                return 'audio/ogg';
            case '.mp3':
            default:
                return 'audio/mpeg';
        }
    }

    protected imageMediaType(extension: string | undefined): string {
        switch (extension) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            case '.bmp':
                return 'image/bmp';
            case '.ico':
                return 'image/x-icon';
            case '.png':
            default:
                return 'image/png';
        }
    }

    protected imageDimensions(buffer: Buffer, extension: string | undefined): { width: number; height: number } | undefined {
        if (extension === '.png' && buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
            return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
        }
        if ((extension === '.jpg' || extension === '.jpeg') && buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
            return this.jpegDimensions(buffer);
        }
        if (extension === '.gif' && buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'GIF') {
            return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
        }
        if (extension === '.webp' && buffer.length >= 30 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
            return this.webpDimensions(buffer);
        }
        return undefined;
    }

    protected jpegDimensions(buffer: Buffer): { width: number; height: number } | undefined {
        let offset = 2;
        while (offset + 9 < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset++;
                continue;
            }
            const marker = buffer[offset + 1];
            const length = buffer.readUInt16BE(offset + 2);
            if (length < 2 || offset + 2 + length > buffer.length) {
                return undefined;
            }
            if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
                return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
            }
            offset += 2 + length;
        }
        return undefined;
    }

    protected webpDimensions(buffer: Buffer): { width: number; height: number } | undefined {
        const chunk = buffer.subarray(12, 16).toString('ascii');
        if (chunk === 'VP8X' && buffer.length >= 30) {
            return {
                width: 1 + buffer.readUIntLE(24, 3),
                height: 1 + buffer.readUIntLE(27, 3)
            };
        }
        return undefined;
    }

    protected extractDiagramText(content: string, extension: string | undefined): string {
        if (extension === '.svg' || extension === '.drawio') {
            return this.xmlText(content);
        }
        return content;
    }

    protected symbolChunks(
        workspacePath: string,
        file: MemoryFile,
        content: string,
        lines: string[],
        symbols: MemorySymbol[],
        indexedAt: string
    ): MemoryCodeChunk[] {
        return symbols
            .filter(symbol => symbol.startLine !== undefined)
            .map(symbol => {
                const startLine = Math.max(1, symbol.startLine ?? 1);
                const endLine = Math.min(lines.length, symbol.endLine ?? this.inferBlockEnd(lines, startLine));
                return this.createChunk({
                    workspacePath,
                    file,
                    chunkKind: 'symbol',
                    title: `${symbol.symbolKind} ${symbol.fullName ?? symbol.name}`,
                    content: this.sliceLines(lines, startLine, endLine),
                    startLine,
                    endLine,
                    indexedAt,
                    symbolName: symbol.fullName ?? symbol.name,
                    stablePart: `symbol:${symbol.id}:${this.hash(content)}`
                });
            })
            .filter((chunk): chunk is MemoryCodeChunk => chunk !== undefined);
    }

    protected structuredChunks(
        workspacePath: string,
        file: MemoryFile,
        content: string,
        lines: string[],
        indexedAt: string
    ): MemoryCodeChunk[] {
        switch (file.extension) {
            case '.md':
                return this.markdownChunks(workspacePath, file, lines, indexedAt);
            case '.json':
                return this.jsonChunks(workspacePath, file, content, lines, indexedAt);
            case '.yaml':
            case '.yml':
                return this.yamlChunks(workspacePath, file, lines, indexedAt);
            case '.sql':
                return this.sqlChunks(workspacePath, file, content, lines, indexedAt);
            default:
                return [];
        }
    }

    protected markdownChunks(workspacePath: string, file: MemoryFile, lines: string[], indexedAt: string): MemoryCodeChunk[] {
        const headings: Array<{ line: number; title: string }> = [];
        lines.forEach((line, index) => {
            const match = /^(#{1,6})\s+(.+)$/.exec(line);
            if (match) {
                headings.push({ line: index + 1, title: match[2].trim() });
            }
        });
        return headings.map((heading, index) => {
            const endLine = (headings[index + 1]?.line ?? lines.length + 1) - 1;
            return this.createChunk({
                workspacePath,
                file,
                chunkKind: 'markdown-section',
                title: heading.title,
                content: this.sliceLines(lines, heading.line, endLine),
                startLine: heading.line,
                endLine,
                indexedAt,
                stablePart: `md:${heading.line}:${heading.title}`
            });
        }).filter((chunk): chunk is MemoryCodeChunk => chunk !== undefined);
    }

    protected jsonChunks(workspacePath: string, file: MemoryFile, content: string, lines: string[], indexedAt: string): MemoryCodeChunk[] {
        try {
            const parsed = JSON.parse(content) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return [];
            }
            return Object.keys(parsed as Record<string, unknown>).slice(0, 80).map(key => {
                const line = this.findLine(lines, `"${key}"`);
                return this.createChunk({
                    workspacePath,
                    file,
                    chunkKind: 'json-block',
                    title: key,
                    content: JSON.stringify({ [key]: (parsed as Record<string, unknown>)[key] }, undefined, 2),
                    startLine: line,
                    endLine: line,
                    indexedAt,
                    stablePart: `json:${key}`
                });
            }).filter((chunk): chunk is MemoryCodeChunk => chunk !== undefined);
        } catch {
            return [];
        }
    }

    protected yamlChunks(workspacePath: string, file: MemoryFile, lines: string[], indexedAt: string): MemoryCodeChunk[] {
        const starts = lines
            .map((line, index) => ({ line: index + 1, match: /^([A-Za-z0-9_.-]+):\s*/.exec(line) }))
            .filter((item): item is { line: number; match: RegExpExecArray } => item.match !== null);
        return starts.slice(0, 80).map((start, index) => {
            const endLine = (starts[index + 1]?.line ?? lines.length + 1) - 1;
            return this.createChunk({
                workspacePath,
                file,
                chunkKind: 'yaml-block',
                title: start.match[1],
                content: this.sliceLines(lines, start.line, endLine),
                startLine: start.line,
                endLine,
                indexedAt,
                stablePart: `yaml:${start.match[1]}:${start.line}`
            });
        }).filter((chunk): chunk is MemoryCodeChunk => chunk !== undefined);
    }

    protected sqlChunks(workspacePath: string, file: MemoryFile, content: string, lines: string[], indexedAt: string): MemoryCodeChunk[] {
        const chunks: MemoryCodeChunk[] = [];
        const statements = this.sqlStatements(content, lines);
        statements.slice(0, 120).forEach((statement, index) => {
            const normalized = statement.text.replace(/\s+/g, ' ').trim();
            const definition = /\bcreate\s+(?:or\s+replace\s+)?(?:table|view|procedure|function|index)\s+(?:if\s+not\s+exists\s+)?([`"[\]\w.]+)/i.exec(normalized);
            const alter = /\balter\s+table\s+(?:if\s+exists\s+)?([`"[\]\w.]+)/i.exec(normalized);
            const relation = /\b(?:foreign\s+key|references)\b/i.test(normalized);
            const migration = this.isSqlMigration(file) || /\b(?:up|down)\s+migration\b/i.test(normalized);
            const title = this.sqlIdentifier(definition?.[1] ?? alter?.[1]) ?? `${file.relativePath} statement ${index + 1}`;
            const chunkKind: MemoryCodeChunkKind = /create\s+(?:or\s+replace\s+)?(?:procedure|function)\b/i.test(normalized)
                ? 'sql-procedure'
                : relation
                    ? 'sql-relation'
                    : migration
                        ? 'sql-migration'
                        : 'sql-schema';
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind,
                title,
                content: statement.text,
                startLine: statement.startLine,
                endLine: statement.endLine,
                indexedAt,
                stablePart: `sql:${chunkKind}:${title}:${statement.startLine}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        });
        return chunks;
    }

    protected sqlStatements(content: string, lines: string[]): Array<{ text: string; startLine: number; endLine: number }> {
        const statements: Array<{ text: string; startLine: number; endLine: number }> = [];
        let startLine = 1;
        let current: string[] = [];
        lines.forEach((line, index) => {
            const withoutInlineComment = line.replace(/--.*$/, '');
            if (!current.length && !withoutInlineComment.trim()) {
                startLine = index + 2;
                return;
            }
            current.push(line);
            if (withoutInlineComment.includes(';')) {
                statements.push({ text: current.join('\n').trim(), startLine, endLine: index + 1 });
                current = [];
                startLine = index + 2;
            }
        });
        if (current.join('\n').trim()) {
            statements.push({ text: current.join('\n').trim(), startLine, endLine: lines.length });
        }
        return statements.length ? statements : [{ text: content.trim(), startLine: 1, endLine: lines.length }];
    }

    protected isSqlMigration(file: MemoryFile): boolean {
        return /(^|[/\\])(migrations?|schema-migrations?|db[/\\]migrate)([/\\]|$)/i.test(file.relativePath)
            || /\b(?:migration|migrate|schema)\b/i.test(file.fileName);
    }

    protected sqlIdentifier(value: string | undefined): string | undefined {
        return value?.replace(/[\[\]`"]/g, '').replace(/^\.+|\.+$/g, '');
    }

    protected fallbackChunks(workspacePath: string, file: MemoryFile, lines: string[], indexedAt: string): MemoryCodeChunk[] {
        const chunks: MemoryCodeChunk[] = [];
        for (let start = 1; start <= lines.length; start += FALLBACK_CHUNK_LINES) {
            const end = Math.min(lines.length, start + FALLBACK_CHUNK_LINES - 1);
            const chunk = this.createChunk({
                workspacePath,
                file,
                chunkKind: start === 1 && end === lines.length ? 'file' : 'text-block',
                title: start === 1 && end === lines.length ? file.relativePath : `${file.relativePath}:${start}-${end}`,
                content: this.sliceLines(lines, start, end),
                startLine: start,
                endLine: end,
                indexedAt,
                stablePart: `fallback:${start}:${end}`
            });
            if (chunk) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    protected createChunk(options: {
        workspacePath: string;
        file: MemoryFile;
        chunkKind: MemoryCodeChunkKind;
        title: string;
        content: string;
        startLine: number;
        endLine: number;
        indexedAt: string;
        stablePart: string;
        symbolName?: string;
    }): MemoryCodeChunk | undefined {
        const content = options.content.trim();
        if (content.length < MIN_CHUNK_CHARS) {
            return undefined;
        }
        const contentHash = this.hash(content);
        return {
            id: `chunk_${this.hash(`${options.workspacePath}:${options.file.relativePath}:${options.stablePart}:${contentHash}`).slice(0, 24)}`,
            workspacePath: options.workspacePath,
            fileId: options.file.id,
            relativePath: options.file.relativePath,
            languageId: options.file.languageId,
            chunkKind: options.chunkKind,
            title: options.title,
            content,
            contentHash,
            symbolName: options.symbolName,
            startLine: options.startLine,
            endLine: options.endLine,
            estimatedTokens: this.estimateTokens(content),
            indexedAt: options.indexedAt
        };
    }

    protected dedupe(chunks: MemoryCodeChunk[]): MemoryCodeChunk[] {
        const seen = new Set<string>();
        return chunks.filter(chunk => {
            const key = `${chunk.relativePath}:${chunk.startLine}:${chunk.endLine}:${chunk.contentHash}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    protected inferBlockEnd(lines: string[], startLine: number): number {
        let depth = 0;
        let sawBrace = false;
        for (let index = startLine - 1; index < lines.length; index++) {
            for (const char of lines[index]) {
                if (char === '{') {
                    depth++;
                    sawBrace = true;
                } else if (char === '}') {
                    depth--;
                }
            }
            if (sawBrace && depth <= 0) {
                return index + 1;
            }
        }
        return Math.min(lines.length, startLine + FALLBACK_CHUNK_LINES - 1);
    }

    protected sliceLines(lines: string[], startLine: number, endLine: number): string {
        return lines.slice(Math.max(0, startLine - 1), Math.max(startLine, endLine)).join('\n');
    }

    protected findLine(lines: string[], text: string): number {
        const index = lines.findIndex(line => line.includes(text));
        return index === -1 ? 1 : index + 1;
    }

    protected externalTextChunks(
        workspacePath: string,
        file: MemoryFile,
        text: string,
        indexedAt: string,
        collection: MemoryExternalDocCollectionPolicy,
        sourceRelativePath: string
    ): MemoryCodeChunk[] {
        const chunks = file.extension === '.md'
            ? this.markdownChunks(workspacePath, file, text.split(/\r?\n/), indexedAt)
            : this.fallbackChunks(workspacePath, file, text.split(/\r?\n/), indexedAt);
        return chunks.map(chunk => ({
            ...chunk,
            sourceKind: 'external-docs',
            source: collection.source ?? collection.label,
            origin: collection.origin ?? `${path.resolve(collection.rootPath)}:${sourceRelativePath}`,
            externalCollectionId: collection.id,
            externalCollectionLabel: collection.label
        }));
    }

    protected async collectExternalDocFiles(root: string, collection: MemoryExternalDocCollectionPolicy): Promise<Array<{ absolutePath: string; sizeBytes: number; contentHash: string; content: string }>> {
        const files: Array<{ absolutePath: string; sizeBytes: number; contentHash: string; content: string }> = [];
        await this.walkExternalDocs(root, root, collection, files);
        return files;
    }

    protected async walkExternalDocs(root: string, current: string, collection: MemoryExternalDocCollectionPolicy, files: Array<{ absolutePath: string; sizeBytes: number; contentHash: string; content: string }>): Promise<void> {
        if (files.length >= (collection.maxFiles ?? 100)) {
            return;
        }
        let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const absolutePath = path.join(current, entry.name);
            const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');
            if (this.matchesAny(relativePath, collection.excludeGlobs ?? [])) {
                continue;
            }
            if (entry.isDirectory()) {
                await this.walkExternalDocs(root, absolutePath, collection, files);
                continue;
            }
            if (!entry.isFile() || !this.isExternalDocExtension(path.extname(entry.name).toLowerCase())) {
                continue;
            }
            if (collection.includeGlobs?.length && !this.matchesAny(relativePath, collection.includeGlobs)) {
                continue;
            }
            const stat = await fs.stat(absolutePath);
            if (stat.size > MAX_FILE_BYTES) {
                continue;
            }
            const content = await fs.readFile(absolutePath, 'utf8');
            files.push({ absolutePath, sizeBytes: stat.size, contentHash: this.hash(content), content });
        }
    }

    protected isExternalDocExtension(extension: string): boolean {
        return ['.md', '.txt', '.json', '.yaml', '.yml'].includes(extension);
    }

    protected languageId(extension: string): string | undefined {
        return extension === '.md' ? 'markdown' : extension === '.json' ? 'json' : extension === '.yaml' || extension === '.yml' ? 'yaml' : undefined;
    }

    protected matchesAny(relativePath: string, patterns: readonly string[]): boolean {
        return patterns.some(pattern => {
            const normalized = pattern.replace(/\\/g, '/').replace(/^\//, '');
            if (normalized.endsWith('/**')) {
                return relativePath.startsWith(normalized.slice(0, -3));
            }
            if (normalized.startsWith('**/*.')) {
                return relativePath.endsWith(normalized.slice(4));
            }
            if (normalized.includes('*')) {
                const expression = new RegExp(`^${normalized.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
                return expression.test(relativePath);
            }
            return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
        });
    }

    protected safeFilePath(workspacePath: string, relativePath: string): string | undefined {
        if (relativePath.includes('\0') || path.isAbsolute(relativePath)) {
            return undefined;
        }
        const root = path.resolve(workspacePath);
        const absolute = path.resolve(root, relativePath);
        const relative = path.relative(root, absolute);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            return undefined;
        }
        return absolute;
    }

    protected estimateTokens(content: string): number {
        return Math.max(1, Math.ceil(content.length / 4));
    }

    protected hash(value: string): string {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }
}

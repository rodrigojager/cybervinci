// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { MemoryFile, MemorySymbol } from '../common';
import { FileContentIndexer } from './file-content-indexer';

describe('FileContentIndexer', () => {

    it('creates stable symbol chunks and skips sensitive files', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-'));
        const relativePath = 'src/service.cs';
        await fs.mkdir(path.join(workspacePath, 'src'));
        await fs.writeFile(path.join(workspacePath, relativePath), [
            'namespace Demo;',
            'public class Service',
            '{',
            '    public string DoWork()',
            '    {',
            '        return "long enough content for a focused chunk";',
            '    }',
            '}'
        ].join('\n'), 'utf8');
        const file = fileFixture({
            id: 'file_service',
            relativePath,
            fileName: 'service.cs',
            extension: '.cs',
            languageId: 'csharp',
            contentHash: 'hash'
        });
        const sensitiveFile = fileFixture({
            id: 'file_secret',
            relativePath: '.env',
            fileName: '.env',
            extension: '',
            contentHash: 'secret',
            isSensitive: true
        });
        const symbol: MemorySymbol = {
            id: 'symbol_do_work',
            fileId: file.id,
            languageId: 'csharp',
            symbolKind: 'method',
            name: 'DoWork',
            fullName: 'Demo.Service.DoWork',
            startLine: 4,
            endLine: 7
        };
        const first = await new FileContentIndexer().indexWorkspace(workspacePath, [file, sensitiveFile], [symbol], '2026-01-01T00:00:00.000Z');
        const second = await new FileContentIndexer().indexWorkspace(workspacePath, [file], [symbol], '2026-01-02T00:00:00.000Z');

        expect(first).to.have.length(1);
        expect(first[0].chunkKind).to.equal('symbol');
        expect(first[0].symbolName).to.equal('Demo.Service.DoWork');
        expect(first[0].content).to.contain('DoWork');
        expect(first[0].id).to.equal(second[0].id);
        expect(first.some(chunk => chunk.fileId === sensitiveFile.id)).to.equal(false);
    });

    it('does not read outside the workspace for traversal, absolute, or null-byte relative paths', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-safe-paths-'));
        const outsidePath = path.join(os.tmpdir(), `pi-outside-${Date.now()}.txt`);
        await fs.writeFile(outsidePath, 'outside workspace content should never be chunked', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'safe.txt'), 'safe workspace content long enough to create a fallback chunk', 'utf8');
        const indexer = new FileContentIndexer();

        const chunks = await indexer.indexWorkspace(workspacePath, [
            fileFixture({ id: 'file_safe', relativePath: 'safe.txt', fileName: 'safe.txt', contentHash: 'safe' }),
            fileFixture({ id: 'file_traversal', relativePath: path.relative(workspacePath, outsidePath), fileName: path.basename(outsidePath), contentHash: 'outside' }),
            fileFixture({ id: 'file_absolute', relativePath: outsidePath, fileName: path.basename(outsidePath), contentHash: 'absolute' }),
            fileFixture({ id: 'file_null', relativePath: 'safe.txt\0.md', fileName: 'safe.txt', contentHash: 'null' })
        ], [], '2026-01-01T00:00:00.000Z');

        expect(chunks.map(chunk => chunk.relativePath)).to.deep.equal(['safe.txt']);
        expect(chunks[0].content).not.to.contain('outside workspace');
    });

    it('skips files over the maximum content indexing payload size', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-large-'));
        const relativePath = 'large.txt';
        await fs.writeFile(path.join(workspacePath, relativePath), 'a'.repeat(257_000), 'utf8');

        const chunks = await new FileContentIndexer().indexWorkspace(workspacePath, [
            fileFixture({ id: 'file_large', relativePath, fileName: relativePath, contentHash: 'large', sizeBytes: 257_000 })
        ], [], '2026-01-01T00:00:00.000Z');

        expect(chunks).to.deep.equal([]);
    });

    it('extracts local PDF text only when opted in and redacts secrets before chunking', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-pdf-'));
        const relativePath = 'docs/decision.pdf';
        await fs.mkdir(path.join(workspacePath, 'docs'));
        await fs.writeFile(path.join(workspacePath, relativePath), minimalPdf('Decision: never store the API key REDACTED_OPENAI_KEY in reports.'), 'latin1');
        const file = fileFixture({
            id: 'file_pdf',
            relativePath,
            fileName: 'decision.pdf',
            extension: '.pdf',
            languageId: 'pdf',
            contentHash: 'pdf',
            sizeBytes: 700,
            isBinary: false
        });
        const indexer = new FileContentIndexer();

        const withoutOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');
        const withOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includePdfDocuments: true });

        expect(withoutOptIn).to.deep.equal([]);
        expect(withOptIn).not.to.deep.equal([]);
        expect(withOptIn.every(chunk => chunk.chunkKind === 'pdf-page')).to.equal(true);
        expect(withOptIn.map(chunk => chunk.content).join('\n')).to.contain('Decision');
        expect(withOptIn.map(chunk => chunk.content).join('\n')).not.to.contain('REDACTED_OPENAI_KEY');
    });

    it('extracts local Office document text only when opted in and redacts secrets before chunking', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-office-'));
        const relativePath = 'docs/decision.docx';
        await fs.mkdir(path.join(workspacePath, 'docs'));
        await fs.writeFile(path.join(workspacePath, relativePath), minimalZipXml('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Decision: keep onboarding notes but redact token: abcdefghijklmnopqrstuvwxyz123456.</w:t></w:r></w:p></w:body></w:document>'));
        const file = fileFixture({
            id: 'file_docx',
            relativePath,
            fileName: 'decision.docx',
            extension: '.docx',
            languageId: 'docx',
            contentHash: 'docx',
            sizeBytes: 700,
            isBinary: false
        });
        const indexer = new FileContentIndexer();

        const withoutOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');
        const withOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includeOfficeDocuments: true });

        expect(withoutOptIn).to.deep.equal([]);
        expect(withOptIn).not.to.deep.equal([]);
        expect(withOptIn.every(chunk => chunk.chunkKind === 'office-document')).to.equal(true);
        expect(withOptIn.map(chunk => chunk.content).join('\n')).to.contain('Decision');
        expect(withOptIn.map(chunk => chunk.content).join('\n')).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('indexes image metadata only when opted in without OCR or remote semantics by default', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-image-'));
        const relativePath = 'assets/system.png';
        await fs.mkdir(path.join(workspacePath, 'assets'));
        await fs.writeFile(path.join(workspacePath, relativePath), minimalPng(32, 16));
        const file = fileFixture({
            id: 'file_png',
            relativePath,
            fileName: 'system.png',
            extension: '.png',
            languageId: 'png',
            contentHash: 'png',
            sizeBytes: 64,
            isBinary: false
        });
        const indexer = new FileContentIndexer();

        const withoutOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');
        const withOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includeImages: true });

        expect(withoutOptIn).to.deep.equal([]);
        expect(withOptIn).to.have.length(1);
        expect(withOptIn[0].chunkKind).to.equal('image-metadata');
        expect(withOptIn[0].content).to.contain('Dimensions: 32x16');
        expect(withOptIn[0].content).to.contain('OCR: disabled');
        expect(withOptIn[0].content).to.contain('Remote semantics: disabled');
    });

    it('records remote image semantics consent only when explicitly allowed', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-image-remote-'));
        const relativePath = 'assets/architecture.png';
        await fs.mkdir(path.join(workspacePath, 'assets'));
        await fs.writeFile(path.join(workspacePath, relativePath), minimalPng(24, 12));
        const file = fileFixture({
            id: 'file_remote_png',
            relativePath,
            fileName: 'architecture.png',
            extension: '.png',
            languageId: 'png',
            contentHash: 'remote-png',
            sizeBytes: 64,
            isBinary: false
        });
        const indexer = new FileContentIndexer();

        const withoutConsent = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includeImages: true });
        const withConsent = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', {
            includeImages: true,
            allowRemoteImageSemantics: true
        });

        expect(withoutConsent).to.have.length(1);
        expect(withoutConsent[0].content).to.contain('OCR: disabled');
        expect(withoutConsent[0].content).to.contain('Remote semantics: disabled');
        expect(withoutConsent[0].content).not.to.contain('consent recorded');
        expect(withConsent).to.have.length(1);
        expect(withConsent[0].content).to.contain('Remote semantics: consent recorded but no remote image semantic provider is invoked by this local indexer');
    });

    it('extracts local diagram text only when opted in and redacts secrets before chunking', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-diagram-'));
        const relativePath = 'docs/flow.mmd';
        await fs.mkdir(path.join(workspacePath, 'docs'));
        await fs.writeFile(path.join(workspacePath, relativePath), [
            'flowchart LR',
            '  A[Client] --> B[API token: abcdefghijklmnopqrstuvwxyz123456]'
        ].join('\n'), 'utf8');
        const file = fileFixture({
            id: 'file_mmd',
            relativePath,
            fileName: 'flow.mmd',
            extension: '.mmd',
            languageId: 'mermaid',
            contentHash: 'mmd',
            sizeBytes: 100,
            isBinary: false
        });
        const indexer = new FileContentIndexer();

        const withoutOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');
        const withOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includeDiagrams: true });

        expect(withoutOptIn).to.deep.equal([]);
        expect(withOptIn).to.have.length(1);
        expect(withOptIn[0].chunkKind).to.equal('diagram-document');
        expect(withOptIn[0].content).to.contain('flowchart LR');
        expect(withOptIn[0].content).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('indexes audio/video only when opted in using local sidecar transcripts with origin, confidence, and redaction', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-media-'));
        const relativePath = 'media/demo.mp4';
        await fs.mkdir(path.join(workspacePath, 'media'));
        await fs.writeFile(path.join(workspacePath, relativePath), Buffer.from([0, 0, 0, 24, 102, 116, 121, 112]));
        await fs.writeFile(path.join(workspacePath, 'media/demo.vtt'), [
            'WEBVTT',
            '',
            '00:00:00.000 --> 00:00:05.000',
            'Decision: use the local queue and redact token: abcdefghijklmnopqrstuvwxyz123456.'
        ].join('\n'), 'utf8');
        const file = fileFixture({
            id: 'file_mp4',
            relativePath,
            fileName: 'demo.mp4',
            extension: '.mp4',
            languageId: 'mp4',
            contentHash: 'mp4',
            sizeBytes: 8,
            isBinary: true
        });
        const indexer = new FileContentIndexer();

        const withoutOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');
        const withOptIn = await indexer.indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', { includeAudioVideo: true });

        expect(withoutOptIn).to.deep.equal([]);
        expect(withOptIn).to.have.length(1);
        expect(withOptIn[0].chunkKind).to.equal('media-transcript');
        expect(withOptIn[0].content).to.contain('Transcription origin: local-sidecar');
        expect(withOptIn[0].content).to.contain('Transcription confidence: 0.90');
        expect(withOptIn[0].content).to.contain('Decision: use the local queue');
        expect(withOptIn[0].content).not.to.contain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('records remote media transcription consent without invoking a remote provider', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-media-remote-'));
        const relativePath = 'media/demo.mp3';
        await fs.mkdir(path.join(workspacePath, 'media'));
        await fs.writeFile(path.join(workspacePath, relativePath), Buffer.from([0x49, 0x44, 0x33]));
        const file = fileFixture({
            id: 'file_mp3',
            relativePath,
            fileName: 'demo.mp3',
            extension: '.mp3',
            languageId: 'mp3',
            contentHash: 'mp3',
            sizeBytes: 3,
            isBinary: true
        });

        const chunks = await new FileContentIndexer().indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', {
            includeAudioVideo: true,
            allowRemoteMediaTranscription: true
        });

        expect(chunks).to.have.length(1);
        expect(chunks[0].chunkKind).to.equal('media-metadata');
        expect(chunks[0].content).to.contain('Transcription origin: none');
        expect(chunks[0].content).to.contain('Transcription confidence: 0');
        expect(chunks[0].content).to.contain('Remote transcription: consent recorded but no remote transcription provider is invoked by this local indexer');
    });

    it('blocks remote media transcription without consent and keeps local metadata fallback', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-media-local-fallback-'));
        const relativePath = 'media/standup.wav';
        await fs.mkdir(path.join(workspacePath, 'media'));
        await fs.writeFile(path.join(workspacePath, relativePath), Buffer.from([0x52, 0x49, 0x46, 0x46]));
        const file = fileFixture({
            id: 'file_wav',
            relativePath,
            fileName: 'standup.wav',
            extension: '.wav',
            languageId: 'wav',
            contentHash: 'wav',
            sizeBytes: 4,
            isBinary: true
        });

        const chunks = await new FileContentIndexer().indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z', {
            includeAudioVideo: true
        });

        expect(chunks).to.have.length(1);
        expect(chunks[0].chunkKind).to.equal('media-metadata');
        expect(chunks[0].content).to.contain('Transcription origin: none');
        expect(chunks[0].content).to.contain('Transcription confidence: 0');
        expect(chunks[0].content).to.contain('Remote transcription: disabled');
        expect(chunks[0].content).not.to.contain('consent recorded');
    });

    it('falls back safely when local document and media extractors are unavailable', async () => {
        class UnavailableExtractorIndexer extends FileContentIndexer {
            protected override extractPdfText(): string {
                throw new Error('pdf extractor unavailable');
            }
            protected override extractOfficeText(): string {
                throw new Error('office extractor unavailable');
            }
            protected override imageDimensions(): { width: number; height: number } {
                throw new Error('image metadata extractor unavailable');
            }
        }
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-extractor-fallback-'));
        await fs.mkdir(path.join(workspacePath, 'docs'));
        await fs.mkdir(path.join(workspacePath, 'assets'));
        await fs.writeFile(path.join(workspacePath, 'docs/decision.pdf'), minimalPdf('Decision: keep extraction local.'), 'latin1');
        await fs.writeFile(path.join(workspacePath, 'docs/decision.docx'), minimalZipXml('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Decision: keep extraction local.</w:t></w:r></w:p></w:body></w:document>'));
        await fs.writeFile(path.join(workspacePath, 'assets/system.png'), minimalPng(32, 16));
        const files = [
            fileFixture({ id: 'file_pdf_unavailable', relativePath: 'docs/decision.pdf', fileName: 'decision.pdf', extension: '.pdf', languageId: 'pdf', contentHash: 'pdf-unavailable', sizeBytes: 700 }),
            fileFixture({ id: 'file_docx_unavailable', relativePath: 'docs/decision.docx', fileName: 'decision.docx', extension: '.docx', languageId: 'docx', contentHash: 'docx-unavailable', sizeBytes: 700 }),
            fileFixture({ id: 'file_png_unavailable', relativePath: 'assets/system.png', fileName: 'system.png', extension: '.png', languageId: 'png', contentHash: 'png-unavailable', sizeBytes: 64 })
        ];

        const chunks = await new UnavailableExtractorIndexer().indexWorkspace(workspacePath, files, [], '2026-01-01T00:00:00.000Z', {
            includePdfDocuments: true,
            includeOfficeDocuments: true,
            includeImages: true
        });

        expect(chunks.map(chunk => chunk.relativePath)).to.deep.equal(['assets/system.png']);
        expect(chunks[0].chunkKind).to.equal('image-metadata');
        expect(chunks[0].content).to.contain('Image file: assets/system.png');
        expect(chunks[0].content).not.to.contain('Dimensions:');
        expect(chunks[0].content).to.contain('Remote semantics: disabled');
    });

    it('creates dedicated SQL chunks for schemas, migrations, procedures, and relations without executing SQL', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-indexer-sql-'));
        const relativePath = 'db/migrations/001_create_orders.sql';
        await fs.mkdir(path.join(workspacePath, 'db/migrations'), { recursive: true });
        await fs.writeFile(path.join(workspacePath, relativePath), [
            'CREATE TABLE Users (Id INT PRIMARY KEY);',
            'CREATE TABLE Orders (Id INT PRIMARY KEY, UserId INT REFERENCES Users(Id));',
            'CREATE PROCEDURE RefreshOrders AS SELECT * FROM Orders;'
        ].join('\n'), 'utf8');
        const file = fileFixture({
            id: 'file_sql',
            relativePath,
            fileName: '001_create_orders.sql',
            extension: '.sql',
            languageId: 'sql',
            contentHash: 'sql',
            sizeBytes: 220
        });

        const chunks = await new FileContentIndexer().indexWorkspace(workspacePath, [file], [], '2026-01-01T00:00:00.000Z');

        expect(chunks.map(chunk => chunk.chunkKind)).to.include.members(['sql-migration', 'sql-relation', 'sql-procedure']);
        expect(chunks.map(chunk => chunk.content).join('\n')).to.contain('CREATE TABLE Users');
        expect(chunks.every(chunk => chunk.relativePath === relativePath)).to.equal(true);
    });
});

function fileFixture(file: Partial<MemoryFile> & Pick<MemoryFile, 'id' | 'relativePath' | 'fileName' | 'contentHash'>): MemoryFile {
    return {
        extension: '.txt',
        sizeBytes: 100,
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false,
        ...file
    };
}

function minimalPdf(text: string): string {
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return [
        '%PDF-1.4',
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj',
        `4 0 obj << /Length ${escaped.length + 20} >>`,
        'stream',
        `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`,
        'endstream',
        'endobj',
        '%%EOF'
    ].join('\n');
}

function minimalZipXml(name: string, xml: string): Buffer {
    const nameBuffer = Buffer.from(name, 'utf8');
    const payload = zlib.deflateRawSync(Buffer.from(xml, 'utf8'));
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(payload.length, 18);
    header.writeUInt32LE(payload.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    return Buffer.concat([header, nameBuffer, payload]);
}

function minimalPng(width: number, height: number): Buffer {
    const buffer = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
    buffer.writeUInt32BE(13, 8);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    buffer[24] = 8;
    buffer[25] = 6;
    return buffer;
}

// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    MemoryFile
} from '@cybervinci/memory/lib/common';
import { CSharpStructuralAnalyzer } from '@cybervinci/memory/lib/node/analysis/csharp-structural-analyzer';
import {
    CSharpRoslynSidecarAnalyzer,
    CSharpRoslynSidecarRequest,
    CSharpRoslynSidecarResponse
} from './csharp-roslyn-sidecar-analyzer';

describe('CSharpRoslynSidecarAnalyzer', () => {

    it('falls back to the structural adapter when the Roslyn sidecar fails', async () => {
        const fallback = new MockFallbackAnalyzer();
        const result = await new ThrowingRoslynAnalyzer(fallback).analyze(contextFor('public class Service { }'));

        expect(result.analyzerId).to.equal('mock-fallback');
        expect(result.symbols.map(symbol => symbol.name)).to.deep.equal(['FallbackService']);
        expect(result.diagnostics?.map(diagnostic => diagnostic.id)).to.include('roslyn-fallback-mode');
        expect(result.diagnostics?.map(diagnostic => diagnostic.id)).to.include('roslyn-sidecar-unavailable');
        expect(fallback.called).to.equal(true);
    });

    it('auto-detects a built bundled sidecar before using the structural fallback', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-workspace-'));
        const sidecarRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-sidecar-'));
        const sidecarDll = path.join(sidecarRoot, 'bin', 'Release', 'net8.0', 'CyberVinci.Memory.RoslynSidecar.dll');
        await fs.mkdir(path.dirname(sidecarDll), { recursive: true });
        await fs.writeFile(path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj'), '<Project />', 'utf8');
        await fs.writeFile(sidecarDll, '', 'utf8');

        const analyzer = new AutoDetectingRoslynAnalyzer(sidecarRoot);
        const result = await analyzer.analyze(contextFor('public class Service { }', workspacePath));

        expect(analyzer.invokedCommand?.command).to.equal(process.env.CYBERVINCI_DOTNET_PATH ?? 'dotnet');
        expect(analyzer.invokedCommand?.args).to.deep.equal([sidecarDll]);
        expect(analyzer.invokedRequest?.workspaceFilePath).to.be.undefined;
        expect(result.analyzerId).to.equal('mock-roslyn');
        expect(result.diagnostics?.[0]?.id).to.equal('roslyn-semantic-mode');
    });

    it('passes a discovered solution or project file to the Roslyn sidecar', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-workspace-file-'));
        const sidecarRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-sidecar-built-'));
        const sidecarDll = path.join(sidecarRoot, 'bin', 'Release', 'net8.0', 'CyberVinci.Memory.RoslynSidecar.dll');
        await fs.mkdir(path.dirname(sidecarDll), { recursive: true });
        await fs.writeFile(path.join(workspacePath, 'App.csproj'), '<Project />', 'utf8');
        await fs.writeFile(path.join(workspacePath, 'App.sln'), '', 'utf8');
        await fs.writeFile(path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj'), '<Project />', 'utf8');
        await fs.writeFile(sidecarDll, '', 'utf8');

        const analyzer = new AutoDetectingRoslynAnalyzer(sidecarRoot);
        await analyzer.analyze(contextFor('public class Service { }', workspacePath));

        expect(analyzer.invokedRequest?.workspaceFilePath).to.equal(path.join(workspacePath, 'App.sln'));
    });

    it('documents the local sidecar build command when a C# workspace has no built sidecar', async () => {
        const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-csharp-workspace-'));
        const sidecarRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-roslyn-unbuilt-sidecar-'));
        await fs.writeFile(path.join(workspacePath, 'App.csproj'), '<Project />', 'utf8');
        await fs.writeFile(path.join(sidecarRoot, 'CyberVinci.Memory.RoslynSidecar.csproj'), '<Project />', 'utf8');

        const result = await new MissingBuildRoslynAnalyzer(sidecarRoot).analyze(contextFor('public class Service { }', workspacePath));

        expect(result.analyzerId).to.equal('csharp-structural-fallback');
        const messages = result.diagnostics?.map(diagnostic => diagnostic.message).join('\n') ?? '';
        expect(messages).to.contain('dotnet build');
        expect(messages).to.contain('CyberVinci.Memory.RoslynSidecar.csproj');
    });

    it('extracts semantic C# fixture coverage for overloads, interfaces, inheritance, endpoints, DI, DbContext, and tests', async function () {
        const fixtureRoot = path.resolve(__dirname, '..', '..', 'roslyn-sidecar', 'test-fixtures', 'semantic-workspace');
        const sidecarDll = await findBuiltSidecarDll(path.resolve(__dirname, '..', '..', 'roslyn-sidecar'));
        if (!sidecarDll) {
            this.skip();
        }

        const analyzer = new CSharpRoslynSidecarAnalyzer({ analyzerPath: sidecarDll, timeoutMs: 30000 });
        const relativePaths = [
            'src/SemanticWorkspace.Api/Services/OrderService.cs',
            'src/SemanticWorkspace.Api/Controllers/OrdersController.cs',
            'src/SemanticWorkspace.Api/Data/OrdersDbContext.cs',
            'src/SemanticWorkspace.Api/Program.cs',
            'tests/SemanticWorkspace.Tests/OrderServiceTests.cs'
        ];
        const results = await Promise.all(relativePaths.map(async relativePath => {
            const content = await fs.readFile(path.join(fixtureRoot, relativePath), 'utf8');
            return analyzer.analyze(contextFor(content, fixtureRoot, relativePath));
        }));
        const symbols = results.flatMap(result => result.symbols);
        const relations = results.flatMap(result => result.relations);
        const callHints = results.flatMap(result => result.callHints ?? []);
        const dependencyHints = results.flatMap(result => result.dependencyHints ?? []);

        expect(results.every(result => result.diagnostics?.some(diagnostic => diagnostic.id === 'roslyn-semantic-mode'))).to.equal(true);

        const createOverloads = symbols.filter(symbol => symbol.name === 'CreateAsync' && symbol.symbolKind === 'method');
        expect(createOverloads).to.have.length(2);
        expect(createOverloads.map(symbol => (symbol.metadata as { parameters?: string[] } | undefined)?.parameters ?? [])).to.deep.include(['string', 'decimal', 'CancellationToken']);
        expect(createOverloads.map(symbol => (symbol.metadata as { parameters?: string[] } | undefined)?.parameters ?? [])).to.deep.include(['Order', 'CancellationToken']);
        expect(createOverloads.map(symbol => (symbol.metadata as { semanticFullName?: string } | undefined)?.semanticFullName)).to.include('SemanticWorkspace.Api.Services.OrderService.CreateAsync(string, decimal, System.Threading.CancellationToken)');
        expect(createOverloads.map(symbol => (symbol.metadata as { semanticFullName?: string } | undefined)?.semanticFullName)).to.include('SemanticWorkspace.Api.Services.OrderService.CreateAsync(SemanticWorkspace.Api.Domain.Order, System.Threading.CancellationToken)');
        expect(callHints.some(hint => hint.targetName === 'SemanticWorkspace.Api.Services.OrderService.CreateAsync(SemanticWorkspace.Api.Domain.Order, System.Threading.CancellationToken)')).to.equal(true);
        expect(relations.some(relation => String(relation.relationType) === 'calls' && relation.evidence === 'calls SemanticWorkspace.Api.Services.OrderService.CreateAsync(SemanticWorkspace.Api.Domain.Order, System.Threading.CancellationToken)')).to.equal(true);

        const orderService = symbols.find(symbol => symbol.fullName === 'SemanticWorkspace.Api.Services.OrderService');
        const orderServiceSemanticName = (orderService?.metadata as { semanticFullName?: string } | undefined)?.semanticFullName;
        expect(orderServiceSemanticName).to.equal('SemanticWorkspace.Api.Services.OrderService');
        const implementsOrderService = relations.find(relation => String(relation.relationType) === 'implements' && relation.evidence?.includes('OrderService implements SemanticWorkspace.Api.Services.IOrderService'));
        expect(implementsOrderService).to.not.equal(undefined);
        expect(implementsOrderService?.targetId).to.not.equal(undefined);
        expect(implementsOrderService?.targetId).to.not.equal(symbols.find(symbol => symbol.fullName === 'SemanticWorkspace.Api.Services.IOrderService')?.id);
        expect(relations.some(relation => String(relation.relationType) === 'inherits' && relation.evidence?.includes('DiscountedOrderService inherits SemanticWorkspace.Api.Services.OrderService'))).to.equal(true);
        expect(relations.some(relation => String(relation.relationType) === 'overrides' && relation.evidence?.includes('DiscountedOrderService.Map') && relation.evidence.includes('OrderService.Map'))).to.equal(true);

        const controller = symbols.find(symbol => symbol.fullName === 'SemanticWorkspace.Api.Controllers.OrdersController');
        expect((controller?.metadata as { normalizedSymbolKind?: string } | undefined)?.normalizedSymbolKind).to.equal('controller');

        const getEndpoint = symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.fullName === 'SemanticWorkspace.Api.Controllers.OrdersController.Get');
        expect(getEndpoint?.metadata).to.include({
            normalizedSymbolKind: 'controller_action',
            isAspNetAction: true,
            route: 'api/orders/{id:int}'
        });
        expect((getEndpoint?.metadata as { httpMethods?: string[] } | undefined)?.httpMethods).to.deep.equal(['GET']);

        expect(dependencyHints.some(hint => hint.evidence?.includes('AddScoped registers service SemanticWorkspace.Api.Services.IOrderService'))).to.equal(true);
        expect(dependencyHints.some(hint => hint.evidence?.includes('AddScoped registers implementation SemanticWorkspace.Api.Services.OrderService'))).to.equal(true);
        expect(dependencyHints.some(hint => hint.evidence?.includes('AddDbContext') && hint.targetTypeName.includes('OrdersDbContext'))).to.equal(true);

        const dbContext = symbols.find(symbol => symbol.name === 'OrdersDbContext' && symbol.symbolKind === 'class');
        expect((dbContext?.metadata as { isDbContext?: boolean } | undefined)?.isDbContext).to.equal(true);
        expect((dbContext?.metadata as { normalizedSymbolKind?: string } | undefined)?.normalizedSymbolKind).to.equal('db_context');
        const ordersDbSet = symbols.find(symbol => symbol.name === 'Orders' && symbol.parentSymbolId === dbContext?.id);
        expect((ordersDbSet?.metadata as { isDbSet?: boolean; efEntitySemanticFullName?: string } | undefined)?.isDbSet).to.equal(true);
        expect((ordersDbSet?.metadata as { isDbSet?: boolean; efEntitySemanticFullName?: string } | undefined)?.efEntitySemanticFullName).to.equal('SemanticWorkspace.Api.Domain.Order');
        expect(relations.some(relation => String(relation.relationType) === 'uses_entity' && relation.evidence?.includes('OrdersDbContext exposes DbSet Orders'))).to.equal(true);

        const testMethod = symbols.find(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'CreateAsync_maps_saved_order');
        expect(testMethod).to.not.equal(undefined);
        expect((testMethod?.metadata as { normalizedSymbolKind?: string } | undefined)?.normalizedSymbolKind).to.equal('test_method');
        expect(relations.some(relation => relation.sourceId === testMethod?.id && String(relation.relationType) === 'tests' && relation.evidence?.includes('test invokes SemanticWorkspace.Api.Services.OrderService.CreateAsync'))).to.equal(true);
        expect(relations.some(relation => relation.sourceId === testMethod?.id && String(relation.relationType) === 'tests' && relation.evidence?.includes('test creates SemanticWorkspace.Api.Services.OrderService'))).to.equal(true);
    });
});

class ThrowingRoslynAnalyzer extends CSharpRoslynSidecarAnalyzer {

    constructor(fallbackAnalyzer: CSharpStructuralAnalyzer) {
        super({ analyzerPath: 'mock-roslyn', fallbackAnalyzer });
    }

    protected override async resolveCommand(): Promise<{ command: string; args: string[] } | undefined> {
        return { command: 'mock-roslyn', args: [] };
    }

    protected override async invoke(_command: { command: string; args: string[] }, _request: CSharpRoslynSidecarRequest): Promise<CSharpRoslynSidecarResponse> {
        throw new Error('mock sidecar failure');
    }
}

class AutoDetectingRoslynAnalyzer extends CSharpRoslynSidecarAnalyzer {

    invokedCommand: { command: string; args: string[] } | undefined;
    invokedRequest: CSharpRoslynSidecarRequest | undefined;

    constructor(protected readonly sidecarRoot: string) {
        super();
    }

    protected override async findBundledSidecarRoot(): Promise<string | undefined> {
        return this.sidecarRoot;
    }

    protected override async invoke(command: { command: string; args: string[] }, request: CSharpRoslynSidecarRequest): Promise<CSharpRoslynSidecarResponse> {
        this.invokedCommand = command;
        this.invokedRequest = request;
        return {
            schemaVersion: 1,
            requestId: request.requestId,
            result: {
                fileId: request.file.id,
                languageId: 'csharp',
                analyzerId: 'mock-roslyn',
                symbols: [],
                relations: []
            },
            diagnostics: [{
                id: 'roslyn-semantic-mode',
                severity: 'info',
                message: 'C# analysis is using Roslyn semantic mode with MSBuild workspace context.',
                path: request.file.relativePath
            }]
        };
    }
}

class MissingBuildRoslynAnalyzer extends CSharpRoslynSidecarAnalyzer {

    constructor(protected readonly sidecarRoot: string) {
        super();
    }

    protected override async findBundledSidecarRoot(): Promise<string | undefined> {
        return this.sidecarRoot;
    }
}

class MockFallbackAnalyzer extends CSharpStructuralAnalyzer {

    called = false;

    override analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        this.called = true;
        return {
            fileId: context.file.id,
            languageId: 'csharp',
            analyzerId: 'mock-fallback',
            symbols: [{
                id: context.createSymbolId('fallback'),
                fileId: context.file.id,
                languageId: 'csharp',
                symbolKind: 'class',
                name: 'FallbackService'
            }],
            relations: []
        };
    }
}

async function findBuiltSidecarDll(sidecarRoot: string): Promise<string | undefined> {
    const candidates = [
        path.join(sidecarRoot, 'bin', 'Release', 'net8.0', 'CyberVinci.Memory.RoslynSidecar.dll'),
        path.join(sidecarRoot, 'bin', 'Debug', 'net8.0', 'CyberVinci.Memory.RoslynSidecar.dll')
    ];
    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // Keep checking common local build outputs.
        }
    }
    return undefined;
}

function contextFor(content: string, workspacePath = '/workspace', relativePath = 'Service.cs'): LanguageAnalysisContext {
    const file: MemoryFile = {
        id: `file_${relativePath.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
        relativePath,
        fileName: path.basename(relativePath),
        extension: path.extname(relativePath),
        languageId: 'csharp',
        sizeBytes: content.length,
        contentHash: 'hash',
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false
    };
    return {
        workspacePath,
        file,
        content,
        createSymbolId: seed => `symbol_${seed}`,
        createRelationId: seed => `relation_${seed}`
    };
}

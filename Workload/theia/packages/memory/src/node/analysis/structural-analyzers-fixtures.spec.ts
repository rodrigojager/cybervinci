// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    MemoryFile,
    MemoryLanguageAnalyzer
} from '../../common';
import { CSharpStructuralAnalyzer } from './csharp-structural-analyzer';
import { CppStructuralAnalyzer } from './cpp-structural-analyzer';
import { GoStructuralAnalyzer } from './go-structural-analyzer';
import { JavaStructuralAnalyzer } from './java-structural-analyzer';
import { PythonStructuralAnalyzer } from './python-structural-analyzer';
import { RustStructuralAnalyzer } from './rust-structural-analyzer';
import { TreeSitterStructuralAnalyzer } from './tree-sitter-structural-analyzer';
import { TypeScriptJavaScriptStructuralAnalyzer } from './typescript-javascript-structural-analyzer';

interface AnalyzerFixtureCase {
    readonly title: string;
    readonly analyzer: MemoryLanguageAnalyzer;
    readonly fixture: string;
    readonly relativePath: string;
    readonly extension: string;
    readonly languageId: string;
    readonly imports?: string[];
    readonly symbols: Array<{ kind: string; name: string }>;
    readonly calls?: string[];
    readonly dependencies?: string[];
    readonly endpoints?: string[];
    readonly tests?: string[];
}

const fixtures: AnalyzerFixtureCase[] = [
    {
        title: 'TypeScript/JavaScript',
        analyzer: new TypeScriptJavaScriptStructuralAnalyzer(),
        fixture: 'orders-controller.fixture',
        relativePath: 'src/orders/orders-controller.ts',
        extension: '.ts',
        languageId: 'typescript',
        imports: ['./order-service', 'express'],
        symbols: [
            { kind: 'interface', name: 'Order' },
            { kind: 'class', name: 'OrdersController' },
            { kind: 'method', name: 'list' }
        ],
        calls: ['listOrders', 'list'],
        dependencies: ['OrderService'],
        endpoints: ['GET /orders'],
        tests: ['lists orders']
    },
    {
        title: 'Python',
        analyzer: new PythonStructuralAnalyzer(),
        fixture: 'orders_api.py',
        relativePath: 'orders/api.py',
        extension: '.py',
        languageId: 'python',
        imports: ['fastapi', 'pytest', 'services.orders'],
        symbols: [
            { kind: 'namespace', name: 'orders.api' },
            { kind: 'class', name: 'OrdersController' },
            { kind: 'method', name: '__init__' },
            { kind: 'method', name: 'helper' }
        ],
        calls: ['list_orders', 'save_order', 'helper'],
        dependencies: ['OrderService', 'OrderInput'],
        endpoints: ['GET /orders', 'POST /orders'],
        tests: ['test_lists_orders']
    },
    {
        title: 'Java',
        analyzer: new JavaStructuralAnalyzer(),
        fixture: 'OrdersController.java',
        relativePath: 'src/main/java/com/demo/orders/OrdersController.java',
        extension: '.java',
        languageId: 'java',
        imports: [
            'org.junit.jupiter.api.Test',
            'org.springframework.web.bind.annotation.GetMapping',
            'org.springframework.web.bind.annotation.RestController'
        ],
        symbols: [
            { kind: 'namespace', name: 'com.demo.orders' },
            { kind: 'class', name: 'OrdersController' },
            { kind: 'field', name: 'service' }
        ],
        calls: ['listOrders'],
        dependencies: ['OrderService'],
        endpoints: ['listOrders'],
        tests: ['listOrders_returnsOrders']
    },
    {
        title: 'Go',
        analyzer: new GoStructuralAnalyzer(),
        fixture: 'handler.go',
        relativePath: 'orders/handler_test.go',
        extension: '.go',
        languageId: 'go',
        imports: ['github.com/go-chi/chi/v5', 'net/http'],
        symbols: [
            { kind: 'namespace', name: 'orders' },
            { kind: 'interface', name: 'OrderService' },
            { kind: 'struct', name: 'OrderHandler' },
            { kind: 'method', name: 'ListOrders' }
        ],
        calls: ['renderOrders', 'writeJSON', 'ListOrders', 'Health'],
        dependencies: ['OrderService', 'OrderHandler'],
        endpoints: ['GET /orders', 'ANY /health'],
        tests: ['TestListOrders']
    },
    {
        title: 'Rust',
        analyzer: new RustStructuralAnalyzer(),
        fixture: 'mod.rs',
        relativePath: 'src/api/mod.rs',
        extension: '.rs',
        languageId: 'rust',
        imports: ['crate::services::AuditLog', 'crate::services::OrderService', 'std::sync::Arc'],
        symbols: [
            { kind: 'namespace', name: 'api' },
            { kind: 'struct', name: 'OrderHandler' },
            { kind: 'enum', name: 'OrderState' },
            { kind: 'interface', name: 'Handler' },
            { kind: 'method', name: 'list' }
        ],
        calls: ['list_orders', 'record_audit', 'list', 'build_handler'],
        dependencies: ['OrderService', 'AuditLog', 'Handler', 'OrderHandler'],
        tests: ['lists_orders']
    },
    {
        title: 'C#',
        analyzer: new CSharpStructuralAnalyzer(),
        fixture: 'OrdersController.cs',
        relativePath: 'src/OrdersController.cs',
        extension: '.cs',
        languageId: 'csharp',
        imports: ['Xunit'],
        symbols: [
            { kind: 'class', name: 'OrdersController' },
            { kind: 'endpoint', name: 'Get' }
        ],
        calls: ['List'],
        dependencies: ['IOrderService'],
        endpoints: ['Get'],
        tests: ['Get_returns_orders']
    },
    {
        title: 'C/C++',
        analyzer: new CppStructuralAnalyzer(),
        fixture: 'handler.cpp',
        relativePath: 'src/orders/handler.cpp',
        extension: '.cpp',
        languageId: 'cpp',
        imports: ['orders/service.hpp', 'vector'],
        symbols: [
            { kind: 'namespace', name: 'demo' },
            { kind: 'class', name: 'BaseHandler' },
            { kind: 'class', name: 'OrderHandler' },
            { kind: 'constructor', name: 'OrderHandler' },
            { kind: 'method', name: 'registerRoutes' }
        ],
        calls: ['listOrders', 'recordAudit', 'list', 'registerRoutes'],
        dependencies: ['BaseHandler', 'OrderService', 'OrderHandler'],
        tests: ['test_register_routes']
    }
];

describe('Memory structural analyzer fixtures', () => {

    for (const fixture of fixtures) {
        it(`extracts symbols, imports, calls, dependencies, endpoints, tests, and confidence for ${fixture.title}`, async () => {
            const result = await analyze(fixture);

            expect(result.analyzerId).to.equal(fixture.analyzer.id);
            expect(result.languageId).to.equal(fixture.languageId);
            if (fixture.imports) {
                expect(result.imports).to.deep.equal(fixture.imports);
            }
            for (const symbol of fixture.symbols) {
                expect(result.symbols.some(candidate => candidate.symbolKind === symbol.kind && candidate.name === symbol.name), `${symbol.kind}:${symbol.name}`).to.equal(true);
            }
            for (const endpoint of fixture.endpoints ?? []) {
                expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === endpoint), `endpoint:${endpoint}`).to.equal(true);
            }
            for (const test of fixture.tests ?? []) {
                expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === test), `test:${test}`).to.equal(true);
            }
            for (const call of fixture.calls ?? []) {
                expect(result.callHints?.some(hint => hint.targetName === call), `call:${call}`).to.equal(true);
            }
            for (const dependency of fixture.dependencies ?? []) {
                expect(result.dependencyHints?.some(hint => hint.targetTypeName === dependency), `dependency:${dependency}`).to.equal(true);
            }
            for (const relation of result.relations) {
                expect(relation.confidenceLevel).to.be.oneOf(['extracted', 'inferred', 'ambiguous', 'user_confirmed']);
                expect(relation.confidenceScore).to.be.greaterThan(0);
                expect(relation.confidenceScore).to.be.at.most(1);
                expect(relation.evidence).to.be.a('string').and.not.empty;
            }
        });
    }

    it('keeps tree-sitter fallback tolerant when optional grammars are unavailable', async () => {
        const fixture: AnalyzerFixtureCase = {
            title: 'Ruby',
            analyzer: new TreeSitterStructuralAnalyzer(),
            fixture: 'invoice_service.rb',
            relativePath: 'lib/billing/invoice_service.rb',
            extension: '.rb',
            languageId: 'ruby',
            symbols: [
                { kind: 'namespace', name: 'Billing' },
                { kind: 'class', name: 'InvoiceService' },
                { kind: 'method', name: 'total_for' }
            ]
        };
        const result = await analyze(fixture);

        for (const symbol of fixture.symbols) {
            expect(result.symbols.some(candidate => candidate.symbolKind === symbol.kind && candidate.name === symbol.name), `${symbol.kind}:${symbol.name}`).to.equal(true);
        }
        const method = result.symbols.find(symbol => symbol.symbolKind === 'method' && symbol.name === 'total_for');
        expect(method?.metadata?.confidenceLevel).to.equal('inferred');
        expect(method?.metadata?.extractionSource).to.equal('heuristic');
        expect(result.relations.some(relation => relation.relationType === 'contains' && relation.confidenceLevel === 'inferred' && relation.confidenceScore === 0.62)).to.equal(true);
        expect(result.diagnostics?.some(diagnostic => diagnostic.severity === 'info' && diagnostic.message.includes('Tree-sitter grammar for ruby is unavailable'))).to.equal(true);
    });

});

function contextFor(fixture: AnalyzerFixtureCase): LanguageAnalysisContext {
    const fixturePath = [
        path.resolve(__dirname, 'fixtures', fixture.fixture),
        path.resolve(__dirname, '../../../src/node/analysis/fixtures', fixture.fixture)
    ].find(candidate => fs.existsSync(candidate));
    if (!fixturePath) {
        throw new Error(`Missing analyzer fixture: ${fixture.fixture}`);
    }
    const content = fs.readFileSync(fixturePath, 'utf8');
    const file: MemoryFile = {
        id: `file_${fixture.languageId}`,
        relativePath: fixture.relativePath,
        fileName: path.basename(fixture.relativePath),
        extension: fixture.extension,
        languageId: fixture.languageId,
        sizeBytes: content.length,
        contentHash: 'hash',
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false
    };
    return {
        workspacePath: '/workspace',
        file,
        content,
        createSymbolId: seed => `symbol_${seed}`,
        createRelationId: seed => `relation_${seed}`
    };
}

async function analyze(fixture: AnalyzerFixtureCase): Promise<LanguageAnalysisResult> {
    return fixture.analyzer.analyze(contextFor(fixture));
}

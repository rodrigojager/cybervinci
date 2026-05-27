// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { MemoryFile } from '../../common';
import { SqlStructuralAnalyzer } from './sql-structural-analyzer';

describe('SqlStructuralAnalyzer', () => {

    it('statically extracts schemas, procedures, migrations, and table relations without executing SQL', () => {
        const file = fileFixture('db/migrations/001_create_orders.sql');
        const analyzer = new SqlStructuralAnalyzer();
        const result = analyzer.analyze({
            workspacePath: '/workspace',
            file,
            content: [
                'CREATE TABLE dbo.Users (',
                '  Id INT PRIMARY KEY,',
                '  Email TEXT NOT NULL',
                ');',
                'CREATE TABLE Orders (',
                '  Id INT PRIMARY KEY,',
                '  UserId INT REFERENCES dbo.Users(Id)',
                ');',
                'CREATE VIEW ActiveOrders AS SELECT o.Id FROM Orders o JOIN dbo.Users u ON u.Id = o.UserId;',
                'CREATE PROCEDURE RefreshOrders AS SELECT * FROM Orders;',
                'CREATE INDEX IX_Orders_UserId ON Orders(UserId);'
            ].join('\n'),
            createSymbolId: seed => `symbol_${seed.replace(/[^a-z0-9]+/gi, '_')}`,
            createRelationId: seed => `rel_${seed.replace(/[^a-z0-9]+/gi, '_')}`
        });

        expect(result.analyzerId).to.equal('sql-structural');
        expect(result.symbols.find(symbol => symbol.symbolKind === 'migration')).to.include({ name: '001_create_orders.sql' });
        expect(result.symbols.some(symbol => symbol.symbolKind === 'table' && symbol.name === 'dbo.Users')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'table' && symbol.name === 'Orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'procedure' && symbol.name === 'RefreshOrders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'index' && symbol.name === 'IX_Orders_UserId')).to.equal(true);
        expect(result.symbols.every(symbol => symbol.metadata?.executesSql === false)).to.equal(true);
        expect(result.relations.some(relation => relation.relationType === 'depends_on' && relation.evidence?.includes('foreign key'))).to.equal(true);
        expect(result.relations.some(relation => relation.relationType === 'references' && relation.evidence?.includes('index IX_Orders_UserId'))).to.equal(true);
        expect(result.relations.every(relation => relation.metadata?.executesSql === false)).to.equal(true);
    });
});

function fileFixture(relativePath: string): MemoryFile {
    return {
        id: 'file_sql',
        relativePath,
        fileName: relativePath.split('/').pop() ?? relativePath,
        extension: '.sql',
        languageId: 'sql',
        sizeBytes: 1000,
        contentHash: 'hash',
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false
    };
}

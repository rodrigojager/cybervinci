// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    MemoryLanguageAnalyzer,
    MemoryRelation,
    MemorySymbol
} from '../../common';

const SQL_EXTENSIONS = new Set(['.sql', '.ddl', '.dml']);

interface SqlObject {
    id: string;
    name: string;
    kind: MemorySymbol['symbolKind'];
}

export class SqlStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'sql-structural';
    readonly languageId = 'sql';
    readonly priority = 6;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'sql' || SQL_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const content = this.stripComments(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const schema = this.addFileSchema(context, symbols);
        const objects = new Map<string, SqlObject>();

        this.extractTables(context, content, schema, symbols, relations, objects);
        this.extractViews(context, content, schema, symbols, relations, objects);
        this.extractProcedures(context, content, schema, symbols, relations, objects);
        this.extractIndexes(context, content, schema, symbols, relations, objects);
        this.extractForeignKeys(context, content, relations, objects);

        return {
            fileId: context.file.id,
            languageId: 'sql',
            analyzerId: this.id,
            symbols,
            relations
        };
    }

    protected addFileSchema(context: LanguageAnalysisContext, symbols: MemorySymbol[]): MemorySymbol {
        const symbol: MemorySymbol = {
            id: context.createSymbolId('sql-schema'),
            fileId: context.file.id,
            languageId: 'sql',
            symbolKind: this.isMigration(context.file.relativePath) ? 'migration' : 'database_schema',
            name: context.file.fileName,
            fullName: context.file.relativePath,
            startLine: 1,
            endLine: context.content.split(/\r?\n/).length,
            metadata: { parser: 'static-sql-ingestion', executesSql: false }
        };
        symbols.push(symbol);
        return symbol;
    }

    protected extractTables(
        context: LanguageAnalysisContext,
        content: string,
        parent: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        objects: Map<string, SqlObject>
    ): void {
        for (const match of content.matchAll(/\bcreate\s+(?:temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?([`"[\]\w.]+)\s*\(([\s\S]*?)\)\s*;/gi)) {
            const name = this.cleanName(match[1]);
            const symbol = this.symbol(context, 'table', name, match.index ?? 0);
            symbols.push(symbol);
            this.registerObject(objects, { id: symbol.id, name, kind: 'table' });
            relations.push(this.relation(context, parent.id, symbol.id, 'contains', `declares SQL table ${name}`));
            for (const column of this.columns(match[2])) {
                const columnSymbol = this.symbol(context, 'column', `${name}.${column}`, match.index ?? 0, symbol.id);
                symbols.push(columnSymbol);
                relations.push(this.relation(context, symbol.id, columnSymbol.id, 'contains', `declares SQL column ${column}`));
            }
        }
    }

    protected extractViews(context: LanguageAnalysisContext, content: string, parent: MemorySymbol, symbols: MemorySymbol[], relations: MemoryRelation[], objects: Map<string, SqlObject>): void {
        for (const match of content.matchAll(/\bcreate\s+(?:or\s+replace\s+)?view\s+([`"[\]\w.]+)\s+as\s+([\s\S]*?);/gi)) {
            const name = this.cleanName(match[1]);
            const symbol = this.symbol(context, 'view', name, match.index ?? 0);
            symbols.push(symbol);
            this.registerObject(objects, { id: symbol.id, name, kind: 'view' });
            relations.push(this.relation(context, parent.id, symbol.id, 'contains', `declares SQL view ${name}`));
            this.addReferences(context, symbol.id, match[2], relations, objects);
        }
    }

    protected extractProcedures(context: LanguageAnalysisContext, content: string, parent: MemorySymbol, symbols: MemorySymbol[], relations: MemoryRelation[], objects: Map<string, SqlObject>): void {
        for (const match of content.matchAll(/\bcreate\s+(?:or\s+replace\s+)?(procedure|function)\s+([`"[\]\w.]+)/gi)) {
            const kind = match[1].toLowerCase() === 'function' ? 'function' : 'procedure';
            const name = this.cleanName(match[2]);
            const symbol = this.symbol(context, kind, name, match.index ?? 0);
            symbols.push(symbol);
            this.registerObject(objects, { id: symbol.id, name, kind });
            relations.push(this.relation(context, parent.id, symbol.id, 'contains', `declares SQL ${kind} ${name}`));
        }
    }

    protected extractIndexes(context: LanguageAnalysisContext, content: string, parent: MemorySymbol, symbols: MemorySymbol[], relations: MemoryRelation[], objects: Map<string, SqlObject>): void {
        for (const match of content.matchAll(/\bcreate\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([`"[\]\w.]+)\s+on\s+([`"[\]\w.]+)/gi)) {
            const name = this.cleanName(match[1]);
            const target = objects.get(this.key(match[2]));
            const symbol = this.symbol(context, 'index', name, match.index ?? 0);
            symbols.push(symbol);
            relations.push(this.relation(context, parent.id, symbol.id, 'contains', `declares SQL index ${name}`));
            if (target) {
                relations.push(this.relation(context, symbol.id, target.id, 'references', `index ${name} targets table ${target.name}`));
            }
        }
    }

    protected extractForeignKeys(context: LanguageAnalysisContext, content: string, relations: MemoryRelation[], objects: Map<string, SqlObject>): void {
        for (const table of objects.values()) {
            const tablePattern = new RegExp(`create\\s+(?:temporary\\s+|temp\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?[\\\`"\\[]?${this.escapeRegExp(table.name.split('.').pop() ?? table.name)}[\\\`"\\]]?\\s*\\(([\\s\\S]*?)\\)\\s*;`, 'i');
            const body = tablePattern.exec(content)?.[1];
            if (!body) {
                continue;
            }
            for (const reference of body.matchAll(/\breferences\s+([`"[\]\w.]+)/gi)) {
                const target = objects.get(this.key(reference[1]));
                if (target && target.id !== table.id) {
                    relations.push(this.relation(context, table.id, target.id, 'depends_on', `foreign key references ${target.name}`));
                }
            }
        }
        for (const match of content.matchAll(/\balter\s+table\s+([`"[\]\w.]+)[\s\S]*?\breferences\s+([`"[\]\w.]+)/gi)) {
            const source = objects.get(this.key(match[1]));
            const target = objects.get(this.key(match[2]));
            if (source && target && source.id !== target.id) {
                relations.push(this.relation(context, source.id, target.id, 'depends_on', `alter table adds foreign key to ${target.name}`));
            }
        }
    }

    protected addReferences(context: LanguageAnalysisContext, sourceId: string, sql: string, relations: MemoryRelation[], objects: Map<string, SqlObject>): void {
        for (const match of sql.matchAll(/\b(?:from|join)\s+([`"[\]\w.]+)/gi)) {
            const target = objects.get(this.key(match[1]));
            if (target) {
                relations.push(this.relation(context, sourceId, target.id, 'references', `SQL references ${target.name}`));
            }
        }
    }

    protected columns(body: string): string[] {
        return body.split(',')
            .map(part => part.trim())
            .filter(part => part && !/^(constraint|primary|foreign|unique|check|key)\b/i.test(part))
            .map(part => this.cleanName(part.split(/\s+/)[0]))
            .filter(Boolean)
            .slice(0, 200);
    }

    protected symbol(context: LanguageAnalysisContext, kind: MemorySymbol['symbolKind'], name: string, offset: number, parentSymbolId?: string): MemorySymbol {
        const startLine = this.lineAt(context.content, offset);
        return {
            id: context.createSymbolId(`${kind}:${name}`),
            fileId: context.file.id,
            languageId: 'sql',
            symbolKind: kind,
            name,
            fullName: name,
            parentSymbolId,
            startLine,
            endLine: startLine,
            metadata: { parser: 'static-sql-ingestion', executesSql: false }
        };
    }

    protected relation(context: LanguageAnalysisContext, sourceId: string, targetId: string, relationType: MemoryRelation['relationType'], evidence: string): MemoryRelation {
        return {
            id: context.createRelationId(`${relationType}:${sourceId}:${targetId}`),
            sourceKind: 'symbol',
            sourceId,
            targetKind: 'symbol',
            targetId,
            relationType,
            confidenceLevel: 'extracted',
            confidenceScore: 0.78,
            evidence,
            metadata: { parser: 'static-sql-ingestion', executesSql: false }
        };
    }

    protected stripComments(content: string): string {
        return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
    }

    protected cleanName(value: string): string {
        return value.replace(/[\[\]`"]/g, '').replace(/^\.+|\.+$/g, '').trim();
    }

    protected key(value: string): string {
        return this.cleanName(value).toLowerCase();
    }

    protected registerObject(objects: Map<string, SqlObject>, object: SqlObject): void {
        objects.set(this.key(object.name), object);
        const shortName = object.name.split('.').pop();
        if (shortName) {
            objects.set(this.key(shortName), object);
        }
    }

    protected isMigration(relativePath: string): boolean {
        return /(^|[/\\])(migrations?|schema-migrations?|db[/\\]migrate)([/\\]|$)/i.test(relativePath);
    }

    protected lineAt(content: string, offset: number): number {
        return content.slice(0, offset).split(/\r?\n/).length;
    }

    protected escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

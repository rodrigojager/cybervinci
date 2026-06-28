// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    LanguageAnalysisContext,
    LanguageAnalysisResult,
    LanguageCallHint,
    LanguageDependencyHint,
    MemoryLanguageAnalyzer,
    MemoryRelation,
    MemorySymbol
} from '../../common';

interface TypeSpan {
    id: string;
    name: string;
    fullName: string;
    kind: MemorySymbol['symbolKind'];
    bodyStart: number;
    bodyEnd: number;
    symbol: MemorySymbol;
}

const CALL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'throw', 'new', 'await', 'typeof', 'void', 'delete']);
const TEST_CALLS = new Set(['it', 'test', 'specify']);
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all', 'use']);
const TS_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']);

export class TypeScriptJavaScriptStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'typescript-javascript-structural';
    readonly languageId = 'typescript';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'typescript'
            || file.languageId === 'javascript'
            || TS_JS_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const languageId = context.file.languageId === 'javascript' ? 'javascript' : 'typescript';
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const imports = this.extractImports(context.content);
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const typeSpans = this.extractTypes(context, masked, languageId, symbols, relations, dependencyHints);

        this.extractFunctions(context, masked, languageId, typeSpans, symbols, relations, callHints, dependencyHints);
        this.extractProperties(context, masked, languageId, typeSpans, symbols, relations);
        this.extractEndpoints(context, context.content, languageId, typeSpans, symbols, relations, callHints);
        this.extractTests(context, context.content, languageId, typeSpans, symbols, relations, callHints);

        return {
            fileId: context.file.id,
            languageId,
            analyzerId: this.id,
            symbols,
            relations,
            imports,
            callHints,
            dependencyHints
        };
    }

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g)) {
            imports.add(match[1]);
        }
        for (const match of content.matchAll(/\bexport\s+(?:type\s+)?(?:\*|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g)) {
            imports.add(match[1]);
        }
        for (const match of content.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
            imports.add(match[1]);
        }
        return [...imports].sort();
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        languageId: string,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): TypeSpan[] {
        const typeSpans: TypeSpan[] = [];
        const pattern = /\b(export\s+)?(abstract\s+)?(class|interface|enum|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*<[^>{};]+>)?(?:\s+extends\s+([A-Za-z_$][A-Za-z0-9_$.]*))?(?:\s+implements\s+([^{]+))?\s*(?:=|{)/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const rawKind = match[3];
            const kind = rawKind === 'type' ? 'interface' : rawKind as MemorySymbol['symbolKind'];
            const name = match[4];
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const id = context.createSymbolId(`${kind}:${name}:${offset}`);
            const symbol: MemorySymbol = {
                id,
                fileId: context.file.id,
                languageId,
                symbolKind: kind,
                name,
                fullName: name,
                signature: this.signatureAt(content, offset),
                startLine: this.lineOf(content, offset),
                endLine: bodyEnd >= bodyStart ? this.lineOf(content, bodyEnd) : undefined,
                modifiers: [match[1] ? 'export' : '', match[2] ? 'abstract' : ''].filter(Boolean),
                metadata: {
                    analyzer: this.id,
                    extends: match[5] ?? '',
                    implements: (match[6] ?? '').replace(/\s+/g, ' ').trim()
                }
            };
            symbols.push(symbol);
            typeSpans.push({ id, name, fullName: name, kind, bodyStart, bodyEnd, symbol });
            for (const inherited of [match[5], ...(match[6] ?? '').split(',')].map(value => value?.trim()).filter((value): value is string => !!value)) {
                dependencyHints.push({
                    sourceSymbolId: id,
                    targetTypeName: this.shortName(inherited),
                    evidence: `${name} depends on ${inherited}`
                });
            }
        }
        return typeSpans;
    }

    protected extractFunctions(
        context: LanguageAnalysisContext,
        content: string,
        languageId: string,
        typeSpans: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const patterns = [
            /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>{}]+>)?\s*\(([^)]*)\)\s*(?::\s*([^={;\n]+))?\s*{/g,
            /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*([^=]+))?=>/g,
            /^\s*(?:public|private|protected|static|async|override|readonly|\s)*([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>{}]+>)?\s*\(([^)]*)\)\s*(?::\s*([^={;\n]+))?\s*{/gm
        ];
        for (const pattern of patterns) {
            for (const match of content.matchAll(pattern)) {
                const offset = match.index ?? 0;
                const parentType = this.deepestTypeAt(typeSpans, offset);
                const name = match[1];
                if (CALL_KEYWORDS.has(name)) {
                    continue;
                }
                const kind: MemorySymbol['symbolKind'] = name === 'constructor' ? 'constructor' : 'method';
                const fullName = parentType ? `${parentType.fullName}.${name}` : name;
                const symbol = this.symbol(context, languageId, kind, name, fullName, offset, parentType?.id, content, match[3]?.trim());
                symbols.push(symbol);
                if (parentType) {
                    relations.push(this.contains(context, parentType.id, symbol.id, `declares ${kind}`));
                }
                this.extractBodyCalls(content, symbol.id, offset, callHints);
                for (const parameter of this.parseParameters(match[2] ?? '')) {
                    if (parameter.typeName && /^[A-Z]/.test(this.shortName(parameter.typeName))) {
                        dependencyHints.push({
                            sourceSymbolId: parentType?.id ?? symbol.id,
                            sourceConstructorSymbolId: name === 'constructor' ? symbol.id : undefined,
                            targetTypeName: this.shortName(parameter.typeName),
                            parameterName: parameter.name,
                            evidence: `${name} parameter ${parameter.name}: ${parameter.typeName}`
                        });
                    }
                }
            }
        }
    }

    protected extractProperties(
        context: LanguageAnalysisContext,
        content: string,
        languageId: string,
        typeSpans: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): void {
        const pattern = /^\s*(?:public|private|protected|readonly|static|\s)*([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:\s*([A-Za-z_$][A-Za-z0-9_$.[\]<>| ]+)\s*(?:=|;|,)/gm;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const parentType = this.deepestTypeAt(typeSpans, offset);
            if (!parentType) {
                continue;
            }
            const name = match[1];
            const symbol = this.symbol(context, languageId, 'property', name, `${parentType.fullName}.${name}`, offset, parentType.id, content, match[2].trim());
            symbols.push(symbol);
            relations.push(this.contains(context, parentType.id, symbol.id, 'declares property'));
        }
    }

    protected extractEndpoints(
        context: LanguageAnalysisContext,
        content: string,
        languageId: string,
        typeSpans: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[]
    ): void {
        for (const match of content.matchAll(/\b(?:app|router|server)\s*\.\s*(get|post|put|delete|patch|head|options|all|use)\s*\(\s*(['"`])([^'"`]+)\2/g)) {
            const offset = match.index ?? 0;
            const method = match[1].toUpperCase();
            const route = match[3];
            const symbol = this.symbol(context, languageId, 'endpoint', `${method} ${route}`, `${context.file.relativePath}:${method}:${route}`, offset, undefined, content);
            symbol.metadata = { ...symbol.metadata, httpMethods: [method], route, framework: 'express-compatible' };
            symbols.push(symbol);
            this.extractBodyCalls(content, symbol.id, offset, callHints);
        }
        for (const match of content.matchAll(/@(Get|Post|Put|Delete|Patch|Head|Options|All)\s*\(\s*(?:(['"`])([^'"`]*)\2)?\s*\)\s*(?:\r?\n\s*)+(?:public|private|protected|async|\s)*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) {
            const offset = match.index ?? 0;
            const parentType = this.deepestTypeAt(typeSpans, offset);
            const method = match[1].toUpperCase();
            const route = match[3] ?? '';
            const name = match[4];
            const symbol = this.symbol(context, languageId, 'endpoint', name, parentType ? `${parentType.fullName}.${name}` : name, offset, parentType?.id, content);
            symbol.metadata = { ...symbol.metadata, httpMethods: [method], route, framework: 'decorator' };
            symbols.push(symbol);
            if (parentType) {
                relations.push(this.contains(context, parentType.id, symbol.id, 'declares endpoint'));
            }
            this.extractBodyCalls(content, symbol.id, offset, callHints);
        }
    }

    protected extractTests(
        context: LanguageAnalysisContext,
        content: string,
        languageId: string,
        typeSpans: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[]
    ): void {
        for (const match of content.matchAll(/\b(it|test|specify)\s*\(\s*(['"`])([^'"`]+)\2\s*,\s*(?:async\s*)?(?:function\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)?\s*=>?/g)) {
            const offset = match.index ?? 0;
            if (!TEST_CALLS.has(match[1])) {
                continue;
            }
            const parentType = this.deepestTypeAt(typeSpans, offset);
            const name = match[3];
            const symbol = this.symbol(context, languageId, 'test_method', name, `${context.file.relativePath}:${name}`, offset, parentType?.id, content);
            symbols.push(symbol);
            if (parentType) {
                relations.push(this.contains(context, parentType.id, symbol.id, 'declares test'));
            }
            this.extractBodyCalls(content, symbol.id, offset, callHints);
        }
    }

    protected symbol(
        context: LanguageAnalysisContext,
        languageId: string,
        kind: MemorySymbol['symbolKind'],
        name: string,
        fullName: string,
        offset: number,
        parentSymbolId: string | undefined,
        content: string,
        returnType?: string
    ): MemorySymbol {
        return {
            id: context.createSymbolId(`${kind}:${fullName}:${offset}`),
            fileId: context.file.id,
            languageId,
            symbolKind: kind,
            name,
            fullName,
            parentSymbolId,
            signature: this.signatureAt(content, offset),
            startLine: this.lineOf(content, offset),
            returnType,
            metadata: {
                analyzer: this.id
            }
        };
    }

    protected contains(context: LanguageAnalysisContext, sourceId: string, targetId: string, evidence: string): MemoryRelation {
        return {
            id: context.createRelationId(`contains:${sourceId}:${targetId}`),
            sourceKind: 'symbol',
            sourceId,
            targetKind: 'symbol',
            targetId,
            relationType: 'contains',
            confidenceLevel: 'extracted',
            confidenceScore: 0.95,
            evidence
        };
    }

    protected extractBodyCalls(content: string, sourceSymbolId: string, memberOffset: number, callHints: LanguageCallHint[]): void {
        const bodyStart = content.indexOf('{', memberOffset);
        if (bodyStart < 0) {
            return;
        }
        const bodyEnd = this.findMatchingBrace(content, bodyStart);
        if (bodyEnd <= bodyStart) {
            return;
        }
        const body = content.slice(bodyStart + 1, bodyEnd);
        for (const match of body.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s*\(/g)) {
            const targetName = match[2] ?? match[1];
            if (!CALL_KEYWORDS.has(targetName) && !HTTP_METHODS.has(targetName)) {
                callHints.push({
                    sourceSymbolId,
                    targetName,
                    evidence: `${targetName}(...)`
                });
            }
        }
    }

    protected parseParameters(parameters: string): Array<{ typeName: string; name: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim())
            .filter(Boolean)
            .map(parameter => parameter.replace(/^(?:(?:public|private|protected|readonly|override)\s+)+/, ''))
            .map(parameter => {
                const match = parameter.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:\s*([^=]+)$/);
                return {
                    name: match?.[1] ?? '',
                    typeName: match?.[2]?.trim() ?? ''
                };
            })
            .filter(parameter => parameter.name && parameter.typeName);
    }

    protected deepestTypeAt(types: TypeSpan[], offset: number): TypeSpan | undefined {
        return types
            .filter(type => type.bodyStart <= offset && offset <= type.bodyEnd)
            .sort((left, right) => right.bodyStart - left.bodyStart)[0];
    }

    protected findMatchingBrace(content: string, openOffset: number): number {
        let depth = 0;
        for (let index = openOffset; index < content.length; index++) {
            if (content[index] === '{') {
                depth++;
            } else if (content[index] === '}') {
                depth--;
                if (depth === 0) {
                    return index;
                }
            }
        }
        return content.length - 1;
    }

    protected signatureAt(content: string, offset: number): string {
        const tail = content.slice(offset, Math.min(content.length, offset + 400));
        const end = tail.search(/[{\r\n;]/);
        return tail.slice(0, end >= 0 ? end : tail.length).replace(/\s+/g, ' ').trim();
    }

    protected shortName(typeName: string): string {
        return typeName.replace(/\?.*$/, '').replace(/<.*$/, '').split('.').pop()?.trim() ?? typeName.trim();
    }

    protected lineOf(content: string, offset: number): number {
        return content.slice(0, offset).split('\n').length;
    }

    protected maskTrivia(content: string): string {
        let result = '';
        let index = 0;
        while (index < content.length) {
            const current = content[index];
            const next = content[index + 1];
            if (current === '/' && next === '/') {
                while (index < content.length && content[index] !== '\n') {
                    result += ' ';
                    index++;
                }
                continue;
            }
            if (current === '/' && next === '*') {
                result += '  ';
                index += 2;
                while (index < content.length && !(content[index] === '*' && content[index + 1] === '/')) {
                    result += content[index] === '\n' ? '\n' : ' ';
                    index++;
                }
                result += '  ';
                index += 2;
                continue;
            }
            if (current === '"' || current === '\'' || current === '`') {
                const quote = current;
                result += quote;
                index++;
                while (index < content.length) {
                    const character = content[index];
                    result += character === '\n' ? '\n' : ' ';
                    index++;
                    if (character === '\\') {
                        result += index < content.length ? ' ' : '';
                        index++;
                    } else if (character === quote) {
                        break;
                    }
                }
                continue;
            }
            result += current;
            index++;
        }
        return result;
    }
}

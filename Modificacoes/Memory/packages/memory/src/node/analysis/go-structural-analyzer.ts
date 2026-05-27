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

interface GoSpan {
    id: string;
    name: string;
    fullName: string;
    kind: MemorySymbol['symbolKind'];
    bodyStart: number;
    bodyEnd: number;
}

const GO_EXTENSIONS = new Set(['.go']);
const CALL_KEYWORDS = new Set(['if', 'for', 'switch', 'select', 'defer', 'go', 'return', 'range', 'case', 'func', 'make', 'new', 'append', 'copy', 'delete', 'len', 'cap', 'panic', 'recover']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ANY']);

export class GoStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'go-structural';
    readonly languageId = 'go';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'go' || GO_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const imports = this.extractImports(context.content);
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const packageSymbol = this.extractPackage(context, masked, symbols);
        const typeSpans = this.extractTypes(context, masked, packageSymbol, symbols, relations, dependencyHints);

        this.extractFunctions(context, masked, packageSymbol, typeSpans, symbols, relations, callHints, dependencyHints);
        this.extractEndpoints(context, context.content, packageSymbol, symbols, relations, callHints);

        return {
            fileId: context.file.id,
            languageId: this.languageId,
            analyzerId: this.id,
            symbols,
            relations,
            imports,
            callHints,
            dependencyHints
        };
    }

    protected extractPackage(context: LanguageAnalysisContext, content: string, symbols: MemorySymbol[]): MemorySymbol {
        const match = content.match(/^\s*package\s+([A-Za-z_][A-Za-z0-9_]*)/m);
        const name = match?.[1] ?? context.file.relativePath.replace(/\\/g, '/').split('/').slice(-2, -1)[0] ?? 'main';
        const symbol = this.symbol(context, 'namespace', name, name, match?.index ?? 0, undefined, content, undefined, {
            packageName: name
        });
        symbols.push(symbol);
        return symbol;
    }

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const block of content.matchAll(/\bimport\s*\(([\s\S]*?)\)/g)) {
            for (const match of block[1].matchAll(/(?:^|\s)(?:[._A-Za-z][A-Za-z0-9_]*\s+)?["`]([^"`]+)["`]/g)) {
                imports.add(match[1]);
            }
        }
        for (const match of content.matchAll(/\bimport\s+(?:[._A-Za-z][A-Za-z0-9_]*\s+)?["`]([^"`]+)["`]/g)) {
            imports.add(match[1]);
        }
        return [...imports].sort();
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        packageSymbol: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): GoSpan[] {
        const spans: GoSpan[] = [];
        const pattern = /\btype\s+([A-Za-z_][A-Za-z0-9_]*)\s+(interface|struct)\s*{/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const name = match[1];
            const kind = match[2] === 'interface' ? 'interface' : 'struct';
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const symbol = this.symbol(context, kind, name, `${packageSymbol.fullName}.${name}`, offset, packageSymbol.id, content);
            symbols.push(symbol);
            relations.push(this.contains(context, packageSymbol.id, symbol.id, `declares ${kind}`));
            spans.push({ id: symbol.id, name, fullName: symbol.fullName ?? name, kind, bodyStart, bodyEnd });

            const body = bodyStart >= 0 ? content.slice(bodyStart + 1, bodyEnd) : '';
            for (const embedded of body.matchAll(/^\s*\*?([A-Z][A-Za-z0-9_]*(?:\.[A-Z][A-Za-z0-9_]*)?)\s*$/gm)) {
                dependencyHints.push({
                    sourceSymbolId: symbol.id,
                    targetTypeName: this.shortName(embedded[1]),
                    evidence: `${name} embeds ${embedded[1]}`
                });
            }
        }
        return spans;
    }

    protected extractFunctions(
        context: LanguageAnalysisContext,
        content: string,
        packageSymbol: MemorySymbol,
        typeSpans: GoSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = /\bfunc\s*(?:\(\s*([^)]+)\s*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:\(([^)]*)\)|([A-Za-z_][A-Za-z0-9_.*\[\]]*))?\s*{/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const receiverType = this.receiverType(match[1] ?? '');
            const parentType = receiverType ? typeSpans.find(span => span.name === receiverType) : undefined;
            const name = match[2];
            const isTest = this.isTestFunction(name, context.file.relativePath);
            const kind: MemorySymbol['symbolKind'] = isTest ? 'test_method' : 'method';
            const fullName = parentType ? `${parentType.fullName}.${name}` : `${packageSymbol.fullName}.${name}`;
            const returnType = (match[4] ?? match[5] ?? '').trim();
            const symbol = this.symbol(context, kind, name, fullName, offset, parentType?.id ?? packageSymbol.id, content, returnType, {
                receiver: receiverType ?? '',
                parameters: this.parameterNames(match[3] ?? '')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, symbol.parentSymbolId ?? packageSymbol.id, symbol.id, `declares ${kind}`));
            this.extractBodyCalls(content, symbol.id, offset, callHints);
            for (const parameter of this.parseParameters(match[3] ?? '')) {
                if (/^[A-Z]/.test(this.shortName(parameter.typeName))) {
                    dependencyHints.push({
                        sourceSymbolId: parentType?.id ?? symbol.id,
                        targetTypeName: this.shortName(parameter.typeName),
                        parameterName: parameter.name,
                        evidence: `${name} parameter ${parameter.name}: ${parameter.typeName}`
                    });
                }
            }
        }
    }

    protected extractEndpoints(
        context: LanguageAnalysisContext,
        content: string,
        packageSymbol: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[]
    ): void {
        const routePatterns = [
            /\b(?:http\.)?HandleFunc\s*\(\s*["`]([^"`]+)["`]\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)/g,
            /\b(?:http\.)?Handle\s*\(\s*["`]([^"`]+)["`]\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)/g
        ];
        for (const pattern of routePatterns) {
            for (const match of content.matchAll(pattern)) {
                this.addEndpoint(context, content, packageSymbol, symbols, relations, callHints, match.index ?? 0, 'ANY', match[1], match[2], 'net-http');
            }
        }
        for (const match of content.matchAll(/\b(?:router|r|app|api|group|e)\s*\.\s*(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|Get|Post|Put|Delete|Patch|Head|Options|Any|AnyRoute|Handle|Use)\s*\(\s*["`]([^"`]+)["`]\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)/g)) {
            const rawMethod = match[1].toUpperCase();
            const method = HTTP_METHODS.has(rawMethod) ? rawMethod : 'ANY';
            this.addEndpoint(context, content, packageSymbol, symbols, relations, callHints, match.index ?? 0, method, match[2], match[3], 'go-router');
        }
    }

    protected addEndpoint(
        context: LanguageAnalysisContext,
        content: string,
        packageSymbol: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        offset: number,
        method: string,
        route: string,
        handler: string,
        framework: string
    ): void {
        const symbol = this.symbol(context, 'endpoint', `${method} ${route}`, `${packageSymbol.fullName}:${method}:${route}`, offset, packageSymbol.id, content, undefined, {
            httpMethods: [method],
            route,
            framework,
            handler: this.shortName(handler)
        });
        symbols.push(symbol);
        relations.push(this.contains(context, packageSymbol.id, symbol.id, 'declares endpoint'));
        callHints.push({ sourceSymbolId: symbol.id, targetName: this.shortName(handler), evidence: `${handler}(...)` });
    }

    protected symbol(
        context: LanguageAnalysisContext,
        kind: MemorySymbol['symbolKind'],
        name: string,
        fullName: string,
        offset: number,
        parentSymbolId: string | undefined,
        content: string,
        returnType?: string,
        metadata: Record<string, string | number | boolean | string[]> = {}
    ): MemorySymbol {
        return {
            id: context.createSymbolId(`${kind}:${fullName}:${offset}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: kind,
            name,
            fullName,
            parentSymbolId,
            signature: this.signatureAt(content, offset),
            startLine: this.lineOf(content, offset),
            returnType,
            metadata: {
                analyzer: this.id,
                ...metadata
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
        const body = content.slice(bodyStart + 1, bodyEnd);
        for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*))?\s*\(/g)) {
            const targetName = match[2] ?? match[1];
            if (!CALL_KEYWORDS.has(targetName)) {
                callHints.push({
                    sourceSymbolId,
                    targetName,
                    evidence: `${targetName}(...)`
                });
            }
        }
    }

    protected parseParameters(parameters: string): Array<{ name: string; typeName: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim())
            .filter(Boolean)
            .map(parameter => {
                const parts = parameter.split(/\s+/);
                const typeName = parts[parts.length - 1] ?? '';
                return {
                    name: parts.length > 1 ? parts.slice(0, -1).join(',') : '',
                    typeName
                };
            })
            .filter(parameter => parameter.typeName);
    }

    protected parameterNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.name).filter(Boolean);
    }

    protected receiverType(receiver: string): string | undefined {
        return receiver.trim().match(/(?:^|\s)\*?([A-Za-z_][A-Za-z0-9_]*)\s*$/)?.[1];
    }

    protected isTestFunction(name: string, relativePath: string): boolean {
        return /_test\.go$/.test(relativePath) && /^Test[A-Z0-9_]/.test(name);
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
        return typeName.replace(/^\*/, '').replace(/\[\]$/, '').split('.').pop()?.trim() ?? typeName.trim();
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
            if (current === '"' || current === '`') {
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

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

interface PythonSpan {
    id: string;
    name: string;
    fullName: string;
    kind: MemorySymbol['symbolKind'];
    indent: number;
    bodyStart: number;
    bodyEnd: number;
    symbol: MemorySymbol;
}

interface DecoratorInfo {
    name: string;
    args: string;
}

const PYTHON_EXTENSIONS = new Set(['.py', '.pyw']);
const CALL_KEYWORDS = new Set(['if', 'elif', 'for', 'while', 'with', 'return', 'raise', 'yield', 'assert', 'lambda', 'class', 'def', 'await', 'async']);
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'route', 'api_route']);
const TEST_DECORATORS = new Set(['pytest.mark.parametrize', 'pytest.mark.asyncio']);

export class PythonStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'python-structural';
    readonly languageId = 'python';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'python' || PYTHON_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const imports = this.extractImports(masked);
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const moduleSymbol = this.extractModule(context, symbols);
        const spans = this.extractClasses(context, masked, moduleSymbol, symbols, relations, dependencyHints);

        this.extractFunctions(context, masked, context.content, moduleSymbol, spans, symbols, relations, callHints, dependencyHints);
        this.extractDjangoUrlPatterns(context, context.content, moduleSymbol, symbols, relations, callHints);

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

    protected extractModule(context: LanguageAnalysisContext, symbols: MemorySymbol[]): MemorySymbol {
        const name = context.file.relativePath
            .replace(/\\/g, '/')
            .replace(/\.pyw?$/, '')
            .replace(/\/__init__$/, '')
            .replace(/\//g, '.');
        const symbol: MemorySymbol = {
            id: context.createSymbolId(`namespace:${name}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: 'namespace',
            name,
            fullName: name,
            startLine: 1,
            metadata: {
                analyzer: this.id,
                modulePath: context.file.relativePath
            }
        };
        symbols.push(symbol);
        return symbol;
    }

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/^\s*import\s+([A-Za-z_][A-Za-z0-9_.]*)(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?/gm)) {
            imports.add(match[1]);
        }
        for (const match of content.matchAll(/^\s*from\s+([A-Za-z_.][A-Za-z0-9_.]*)\s+import\s+/gm)) {
            imports.add(match[1]);
        }
        return [...imports].sort();
    }

    protected extractClasses(
        context: LanguageAnalysisContext,
        content: string,
        moduleSymbol: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): PythonSpan[] {
        const spans: PythonSpan[] = [];
        for (const match of content.matchAll(/^([ \t]*)class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\(([^)]*)\))?\s*:/gm)) {
            const offset = match.index ?? 0;
            const indent = this.indentOf(match[1]);
            const parent = this.deepestSpanAt(spans, offset, indent);
            const name = match[2];
            const fullName = `${parent?.fullName ?? moduleSymbol.fullName}.${name}`;
            const bodyEnd = this.findIndentedBlockEnd(content, offset, indent);
            const symbol = this.symbol(context, 'class', name, fullName, offset, parent?.id ?? moduleSymbol.id, content, undefined, {
                baseTypes: this.splitBases(match[3] ?? '')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, symbol.parentSymbolId ?? moduleSymbol.id, symbol.id, 'declares class'));
            spans.push({ id: symbol.id, name, fullName, kind: 'class', indent, bodyStart: offset, bodyEnd, symbol });
            for (const baseType of this.splitBases(match[3] ?? '')) {
                dependencyHints.push({
                    sourceSymbolId: symbol.id,
                    targetTypeName: this.shortName(baseType),
                    evidence: `${name} extends ${baseType}`
                });
            }
        }
        return spans;
    }

    protected extractFunctions(
        context: LanguageAnalysisContext,
        content: string,
        originalContent: string,
        moduleSymbol: MemorySymbol,
        spans: PythonSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        for (const match of content.matchAll(/^([ \t]*)(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*([^:\r\n]+))?\s*:/gm)) {
            const offset = match.index ?? 0;
            const indent = this.indentOf(match[1]);
            const parent = this.deepestSpanAt(spans, offset, indent);
            const decorators = this.decoratorsBefore(originalContent, offset);
            const endpoint = this.endpointFromDecorators(decorators);
            const name = match[2];
            const isTest = this.isTestFunction(name, parent, decorators, context.file.relativePath);
            const kind: MemorySymbol['symbolKind'] = isTest ? 'test_method' : endpoint ? 'endpoint' : 'method';
            const fullName = `${parent?.fullName ?? moduleSymbol.fullName}.${name}`;
            const symbol = this.symbol(context, kind, endpoint?.name ?? name, fullName, offset, parent?.id ?? moduleSymbol.id, content, match[4]?.trim(), {
                parameters: this.parameterNames(match[3] ?? ''),
                httpMethods: endpoint?.methods ?? [],
                route: endpoint?.route ?? '',
                framework: endpoint?.framework ?? '',
                decorators: decorators.map(decorator => decorator.name)
            });
            symbols.push(symbol);
            relations.push(this.contains(context, symbol.parentSymbolId ?? moduleSymbol.id, symbol.id, `declares ${kind}`));
            this.extractBodyCalls(content, symbol.id, offset, indent, callHints);
            for (const parameter of this.parseParameters(match[3] ?? '')) {
                if (parameter.typeName && /^[A-Z]/.test(this.shortName(parameter.typeName))) {
                    dependencyHints.push({
                        sourceSymbolId: parent?.id ?? symbol.id,
                        targetTypeName: this.shortName(parameter.typeName),
                        parameterName: parameter.name,
                        evidence: `${name} parameter ${parameter.name}: ${parameter.typeName}`
                    });
                }
            }
        }
    }

    protected extractDjangoUrlPatterns(
        context: LanguageAnalysisContext,
        content: string,
        moduleSymbol: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[]
    ): void {
        for (const match of content.matchAll(/\b(?:path|re_path)\s*\(\s*(['"])([^'"]*)\1\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)/g)) {
            const offset = match.index ?? 0;
            const route = match[2];
            const viewName = this.shortName(match[3]);
            const symbol = this.symbol(context, 'endpoint', `ANY ${route}`, `${moduleSymbol.fullName}:ANY:${route}`, offset, moduleSymbol.id, content, undefined, {
                httpMethods: ['ANY'],
                route,
                framework: 'django-urlpattern',
                view: viewName
            });
            symbols.push(symbol);
            relations.push(this.contains(context, moduleSymbol.id, symbol.id, 'declares endpoint'));
            callHints.push({ sourceSymbolId: symbol.id, targetName: viewName, evidence: `${viewName}(...)` });
        }
    }

    protected endpointFromDecorators(decorators: DecoratorInfo[]): { name: string; methods: string[]; route: string; framework: string } | undefined {
        for (const decorator of decorators) {
            const method = decorator.name.split('.').pop()?.toLowerCase() ?? '';
            if (!HTTP_METHODS.has(method)) {
                continue;
            }
            const route = decorator.args.match(/^\s*(['"])([^'"]*)\1/)?.[2] ?? '';
            const explicitMethods = [...decorator.args.matchAll(/methods\s*=\s*\[([^\]]+)\]/g)]
                .flatMap(match => [...match[1].matchAll(/['"]([A-Za-z]+)['"]/g)].map(methodMatch => methodMatch[1].toUpperCase()));
            const methods = method === 'route' || method === 'api_route'
                ? (explicitMethods.length ? explicitMethods : ['ANY'])
                : [method.toUpperCase()];
            return {
                name: `${methods.join('|')} ${route}`,
                methods,
                route,
                framework: decorator.name.includes('router') ? 'fastapi' : 'flask-compatible'
            };
        }
        return undefined;
    }

    protected isTestFunction(name: string, parent: PythonSpan | undefined, decorators: DecoratorInfo[], relativePath: string): boolean {
        return name.startsWith('test_')
            || parent?.name.startsWith('Test') === true
            || /(?:^|[\\/])tests?[\\/]/.test(relativePath)
            || decorators.some(decorator => TEST_DECORATORS.has(decorator.name) || decorator.name.startsWith('pytest.mark.'));
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

    protected extractBodyCalls(content: string, sourceSymbolId: string, offset: number, indent: number, callHints: LanguageCallHint[]): void {
        const bodyEnd = this.findIndentedBlockEnd(content, offset, indent);
        const body = content.slice(offset, bodyEnd);
        for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*))?\s*\(/g)) {
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

    protected decoratorsBefore(content: string, offset: number): DecoratorInfo[] {
        const lines = content.slice(0, offset).split(/\r?\n/);
        const decorators: DecoratorInfo[] = [];
        for (let index = lines.length - 1; index >= 0; index--) {
            const line = lines[index].trim();
            if (!line) {
                continue;
            }
            const match = line.match(/^@([A-Za-z_][A-Za-z0-9_.]*)(?:\((.*)\))?$/);
            if (!match) {
                break;
            }
            decorators.unshift({ name: match[1], args: match[2] ?? '' });
        }
        return decorators;
    }

    protected parseParameters(parameters: string): Array<{ name: string; typeName: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim())
            .filter(parameter => parameter.length > 0)
            .map(parameter => parameter.replace(/=.*/, '').trim())
            .map(parameter => {
                const match = parameter.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=]+)$/);
                return {
                    name: match?.[1] ?? parameter.replace(/^\*+/, ''),
                    typeName: match?.[2]?.trim() ?? ''
                };
            })
            .filter(parameter => parameter.name && !['self', 'cls'].includes(parameter.name));
    }

    protected parameterNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.name);
    }

    protected splitBases(baseList: string): string[] {
        return baseList.split(',').map(base => base.trim()).filter(Boolean);
    }

    protected deepestSpanAt(spans: PythonSpan[], offset: number, indent: number): PythonSpan | undefined {
        return spans
            .filter(span => span.bodyStart < offset && offset <= span.bodyEnd && span.indent < indent)
            .sort((left, right) => right.indent - left.indent)[0];
    }

    protected findIndentedBlockEnd(content: string, offset: number, indent: number): number {
        const nextLine = content.indexOf('\n', offset);
        if (nextLine < 0) {
            return content.length;
        }
        const tail = content.slice(nextLine + 1);
        let cursor = nextLine + 1;
        for (const line of tail.split(/\n/)) {
            const bareLine = line.replace(/\r$/, '');
            if (bareLine.trim() && this.indentOf(bareLine.match(/^[ \t]*/)?.[0] ?? '') <= indent) {
                return cursor;
            }
            cursor += line.length + 1;
        }
        return content.length;
    }

    protected signatureAt(content: string, offset: number): string {
        const tail = content.slice(offset, Math.min(content.length, offset + 500));
        const end = tail.indexOf('\n');
        return tail.slice(0, end >= 0 ? end : tail.length).replace(/\s+/g, ' ').trim();
    }

    protected shortName(typeName: string): string {
        return typeName.replace(/\[.*$/, '').split('.').pop()?.trim() ?? typeName.trim();
    }

    protected indentOf(value: string): number {
        return [...value].reduce((total, character) => total + (character === '\t' ? 4 : 1), 0);
    }

    protected lineOf(content: string, offset: number): number {
        return content.slice(0, offset).split('\n').length;
    }

    protected maskTrivia(content: string): string {
        let result = '';
        let index = 0;
        while (index < content.length) {
            if (content[index] === '#') {
                while (index < content.length && content[index] !== '\n') {
                    result += ' ';
                    index++;
                }
                continue;
            }
            if (content[index] === '"' || content[index] === '\'') {
                const quote = content[index];
                const triple = content.slice(index, index + 3) === quote.repeat(3);
                result += triple ? quote.repeat(3) : quote;
                index += triple ? 3 : 1;
                while (index < content.length) {
                    if (triple && content.slice(index, index + 3) === quote.repeat(3)) {
                        result += quote.repeat(3);
                        index += 3;
                        break;
                    }
                    const character = content[index];
                    result += character === '\n' ? '\n' : ' ';
                    index++;
                    if (!triple && character === '\\') {
                        result += index < content.length ? ' ' : '';
                        index++;
                    } else if (!triple && character === quote) {
                        break;
                    }
                }
                continue;
            }
            result += content[index];
            index++;
        }
        return result;
    }
}

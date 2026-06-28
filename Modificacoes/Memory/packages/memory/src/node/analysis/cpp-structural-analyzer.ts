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

interface CppSpan {
    id: string;
    name: string;
    fullName: string;
    kind: MemorySymbol['symbolKind'];
    bodyStart: number;
    bodyEnd: number;
}

const CPP_EXTENSIONS = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx']);
const CALL_KEYWORDS = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'return', 'sizeof', 'alignof', 'static_cast', 'dynamic_cast', 'reinterpret_cast',
    'const_cast', 'new', 'delete', 'throw', 'decltype'
]);

export class CppStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'cpp-structural';
    readonly languageId = 'cpp';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'c' || file.languageId === 'cpp' || CPP_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const imports = this.extractIncludes(context.content);
        const root = this.rootNamespace(context, masked, symbols);
        const namespaceSpans = this.extractNamespaces(context, masked, root, symbols, relations);
        const typeSpans = this.extractTypes(context, masked, root, namespaceSpans, symbols, relations, dependencyHints);

        this.extractFunctions(context, masked, root, namespaceSpans, typeSpans, symbols, relations, callHints, dependencyHints);

        return {
            fileId: context.file.id,
            languageId: this.languageIdFor(context),
            analyzerId: this.id,
            symbols,
            relations,
            imports,
            callHints,
            dependencyHints
        };
    }

    protected rootNamespace(context: LanguageAnalysisContext, content: string, symbols: MemorySymbol[]): MemorySymbol {
        const name = context.file.relativePath.replace(/\\/g, '/').replace(/\.[^.]+$/, '').split('/').filter(Boolean).join('::') || 'translation-unit';
        const symbol = this.symbol(context, 'namespace', name, name, 0, undefined, content, undefined, { translationUnit: true });
        symbols.push(symbol);
        return symbol;
    }

    protected extractIncludes(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)) {
            imports.add(match[1].trim());
        }
        return [...imports].sort();
    }

    protected extractNamespaces(
        context: LanguageAnalysisContext,
        content: string,
        root: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): CppSpan[] {
        const spans: CppSpan[] = [];
        for (const match of content.matchAll(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_:]*)\s*{/g)) {
            const offset = match.index ?? 0;
            const name = match[1];
            const parent = this.parentAt(offset, spans) ?? root;
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const symbol = this.symbol(context, 'namespace', name, `${parent.fullName}::${name}`, offset, parent.id, content);
            symbols.push(symbol);
            relations.push(this.contains(context, parent.id, symbol.id, 'declares namespace'));
            spans.push({ id: symbol.id, name, fullName: symbol.fullName ?? name, kind: 'namespace', bodyStart, bodyEnd });
        }
        return spans;
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        root: MemorySymbol,
        namespaceSpans: CppSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): CppSpan[] {
        const spans: CppSpan[] = [];
        const pattern = /\b(class|struct|enum)\s+(?:class\s+)?([A-Za-z_][A-Za-z0-9_]*)\b([^;{]*)[{;]/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const declarationKind = match[1];
            const name = match[2];
            const kind: MemorySymbol['symbolKind'] = declarationKind as MemorySymbol['symbolKind'];
            const parent = this.parentAt(offset, namespaceSpans) ?? root;
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const hasBody = bodyStart >= 0 && match[0].includes('{');
            const bodyEnd = hasBody ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const symbol = this.symbol(context, kind, name, `${parent.fullName}::${name}`, offset, parent.id, content, undefined, {
                declarationOnly: !hasBody
            });
            symbols.push(symbol);
            relations.push(this.contains(context, parent.id, symbol.id, `declares ${declarationKind}`));
            spans.push({ id: symbol.id, name, fullName: symbol.fullName ?? name, kind, bodyStart, bodyEnd });

            for (const base of this.baseTypes(match[3] ?? '')) {
                dependencyHints.push({ sourceSymbolId: symbol.id, targetTypeName: base, evidence: `${name} derives from ${base}` });
            }
            if (hasBody) {
                this.extractFieldDependencies(content.slice(bodyStart + 1, bodyEnd), name, symbol.id, dependencyHints);
            }
        }
        return spans;
    }

    protected extractFunctions(
        context: LanguageAnalysisContext,
        content: string,
        root: MemorySymbol,
        namespaceSpans: CppSpan[],
        typeSpans: CppSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = /(?:^|[;{}\n])\s*(?:template\s*<[^>{}]*>\s*)?(?:(?:inline|static|virtual|constexpr|consteval|friend|extern)\s+)*(?:(?:explicit)\s+)?(?:(~?[A-Za-z_][A-Za-z0-9_:<>~*&\s,]+?)\s+)?([A-Za-z_~][A-Za-z0-9_:~]*)\s*\(([^()]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:(?:override|final)\s*)*(?:->\s*([A-Za-z_][A-Za-z0-9_:<>~*&\s,]*))?\s*(?::[^{;]*)?(?:[{;]|=\s*(?:0|default|delete)\s*;)/gm;
        for (const match of content.matchAll(pattern)) {
            const declarationStart = match[0].search(/[A-Za-z_~]/);
            const offset = (match.index ?? 0) + (declarationStart >= 0 ? declarationStart : 0);
            const rawName = match[2];
            const name = rawName.split('::').pop() ?? rawName;
            if (CALL_KEYWORDS.has(name) || this.isControlLikePrefix(match[0]) || this.looksLikeInvocation(content, offset, match[0], match[1])) {
                continue;
            }
            const qualifiedOwner = rawName.includes('::') ? rawName.split('::').slice(0, -1).pop() : undefined;
            const parent = (qualifiedOwner ? typeSpans.find(span => span.name === qualifiedOwner) : undefined)
                ?? this.parentAt(offset, typeSpans)
                ?? this.parentAt(offset, namespaceSpans)
                ?? root;
            const parentKind = 'kind' in parent ? parent.kind : parent.symbolKind;
            const kind: MemorySymbol['symbolKind'] = parentKind !== 'namespace' && (name === parent.name || name === `~${parent.name}`)
                ? 'constructor'
                : this.isTestFunction(name, context.file.relativePath) ? 'test_method' : 'method';
            const returnType = (match[4] ?? match[1] ?? '').trim();
            const fullName = rawName.includes('::') ? rawName : `${parent.fullName}::${name}`;
            const symbol = this.symbol(context, kind, name, fullName, offset, parent.id, content, returnType, {
                parameters: this.parameterNames(match[3] ?? '')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, parent.id, symbol.id, `declares ${kind}`));
            this.extractParameterDependencies(match[3] ?? '', symbol.id, name, dependencyHints);
            this.extractBodyCalls(content, symbol.id, offset, callHints);
        }
    }

    protected extractFieldDependencies(body: string, typeName: string, sourceSymbolId: string, dependencyHints: LanguageDependencyHint[]): void {
        for (const match of body.matchAll(/^\s*(?:private|protected|public)?\s*(?:static\s+)?(?:const\s+)?([A-Z][A-Za-z0-9_:<>]*)(?:\s*[*&])?\s+([A-Za-z_][A-Za-z0-9_]*)\s*[;=]/gm)) {
            dependencyHints.push({
                sourceSymbolId,
                targetTypeName: this.shortName(match[1]),
                parameterName: match[2],
                evidence: `${typeName} field ${match[2]}: ${match[1]}`
            });
        }
    }

    protected extractParameterDependencies(parameters: string, sourceSymbolId: string, functionName: string, dependencyHints: LanguageDependencyHint[]): void {
        for (const parameter of this.parseParameters(parameters)) {
            const targetTypeName = this.shortName(parameter.typeName);
            if (/^[A-Z]/.test(targetTypeName)) {
                dependencyHints.push({
                    sourceSymbolId,
                    targetTypeName,
                    parameterName: parameter.name,
                    evidence: `${functionName} parameter ${parameter.name}: ${parameter.typeName}`
                });
            }
        }
    }

    protected extractBodyCalls(content: string, sourceSymbolId: string, memberOffset: number, callHints: LanguageCallHint[]): void {
        const bodyStart = content.indexOf('{', memberOffset);
        const semicolon = content.indexOf(';', memberOffset);
        if (bodyStart < 0 || (semicolon >= 0 && semicolon < bodyStart)) {
            return;
        }
        const bodyEnd = this.findMatchingBrace(content, bodyStart);
        const body = content.slice(bodyStart + 1, bodyEnd);
        for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:(?:::|->|\.)\s*([A-Za-z_~][A-Za-z0-9_~]*))?\s*\(/g)) {
            const targetName = match[2] ?? match[1];
            if (!CALL_KEYWORDS.has(targetName)) {
                callHints.push({ sourceSymbolId, targetName, evidence: `${targetName}(...)` });
            }
        }
    }

    protected baseTypes(raw: string): string[] {
        const baseList = raw.match(/:\s*(.+)$/)?.[1];
        if (!baseList) {
            return [];
        }
        return baseList.split(',').map(base => this.shortName(base.replace(/\b(public|private|protected|virtual)\b/g, '').trim())).filter(Boolean);
    }

    protected parseParameters(parameters: string): Array<{ name: string; typeName: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim().replace(/=.*/, '').trim())
            .filter(parameter => parameter && parameter !== 'void')
            .map(parameter => {
                const match = parameter.match(/^(.+?)([A-Za-z_][A-Za-z0-9_]*)$/);
                return match ? { name: match[2], typeName: match[1].trim() } : undefined;
            })
            .filter((parameter): parameter is { name: string; typeName: string } => !!parameter);
    }

    protected parameterNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.name);
    }

    protected parentAt(offset: number, spans: CppSpan[]): CppSpan | undefined {
        return spans
            .filter(span => span.bodyStart >= 0 && offset > span.bodyStart && offset < span.bodyEnd)
            .sort((left, right) => right.bodyStart - left.bodyStart)[0];
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
            languageId: this.languageIdFor(context),
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

    protected languageIdFor(context: LanguageAnalysisContext): string {
        return context.file.extension === '.c' || context.file.languageId === 'c' ? 'c' : 'cpp';
    }

    protected isTestFunction(name: string, relativePath: string): boolean {
        return /(^|[\\/])(test|tests|spec)s?([\\/]|$)/i.test(relativePath) || /(?:^|_)(test|spec)_?/i.test(name);
    }

    protected isControlLikePrefix(raw: string): boolean {
        return /^\s*(?:if|for|while|switch|catch)\s*\(/.test(raw);
    }

    protected looksLikeInvocation(content: string, offset: number, rawMatch: string, returnType?: string): boolean {
        if (returnType?.trim()) {
            if (/;\s*$/.test(rawMatch) && /^[a-z_]/.test(rawMatch.match(/([A-Za-z_~][A-Za-z0-9_:~]*)\s*\(/)?.[1] ?? '')) {
                return true;
            }
            return false;
        }
        const lineStart = content.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
        const linePrefix = content.slice(lineStart, offset).trim();
        if (linePrefix && linePrefix !== 'public:' && linePrefix !== 'private:' && linePrefix !== 'protected:') {
            return true;
        }
        return !/[{;=]\s*$/.test(rawMatch) && !/\b(?:explicit|virtual|inline|static|constexpr|consteval)\b/.test(rawMatch);
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
        const tail = content.slice(offset, Math.min(content.length, offset + 500));
        const end = tail.search(/[{\r\n;]/);
        return tail.slice(0, end >= 0 ? end : tail.length).replace(/\s+/g, ' ').trim();
    }

    protected shortName(typeName: string): string {
        return typeName
            .replace(/\b(const|volatile|static|mutable|typename|class|struct)\b/g, '')
            .replace(/[&*]/g, ' ')
            .replace(/<.*>$/, '')
            .split('::')
            .pop()
            ?.trim() ?? typeName.trim();
    }

    protected lineOf(content: string, offset: number): number {
        return content.slice(0, Math.max(0, offset)).split('\n').length;
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

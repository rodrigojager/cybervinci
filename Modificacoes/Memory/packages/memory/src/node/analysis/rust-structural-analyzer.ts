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

interface RustSpan {
    id: string;
    name: string;
    fullName: string;
    kind: MemorySymbol['symbolKind'];
    bodyStart: number;
    bodyEnd: number;
}

const RUST_EXTENSIONS = new Set(['.rs']);
const CALL_KEYWORDS = new Set([
    'if', 'for', 'while', 'loop', 'match', 'return', 'break', 'continue', 'async', 'await', 'Some', 'Ok', 'Err', 'Box', 'Vec'
]);

export class RustStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'rust-structural';
    readonly languageId = 'rust';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'rust' || RUST_EXTENSIONS.has(file.extension ?? '');
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const imports = this.extractImports(context.content);
        const rootModule = this.rootModule(context, masked, symbols);
        const moduleSpans = this.extractModules(context, masked, rootModule, symbols, relations);
        const typeSpans = this.extractTypes(context, masked, rootModule, moduleSpans, symbols, relations, dependencyHints);

        this.extractFunctions(context, masked, rootModule, moduleSpans, typeSpans, symbols, relations, callHints, dependencyHints);

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

    protected rootModule(context: LanguageAnalysisContext, content: string, symbols: MemorySymbol[]): MemorySymbol {
        const name = context.file.relativePath
            .replace(/\\/g, '/')
            .replace(/\.rs$/, '')
            .replace(/(^|\/)(mod|lib|main)$/, '')
            .split('/')
            .filter(Boolean)
            .join('::') || 'crate';
        const symbol = this.symbol(context, 'namespace', name, name, 0, undefined, content, undefined, { modulePath: name });
        symbols.push(symbol);
        return symbol;
    }

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/^\s*(?:pub\s+)?use\s+([^;]+);/gm)) {
            for (const item of this.expandUse(match[1].trim())) {
                imports.add(item);
            }
        }
        return [...imports].sort();
    }

    protected expandUse(raw: string): string[] {
        const normalized = raw.replace(/\s+/g, '');
        const group = normalized.match(/^(.*)::\{(.+)\}$/);
        if (!group) {
            return [normalized];
        }
        return group[2].split(',').filter(Boolean).map(item => `${group[1]}::${item}`);
    }

    protected extractModules(
        context: LanguageAnalysisContext,
        content: string,
        rootModule: MemorySymbol,
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): RustSpan[] {
        const spans: RustSpan[] = [];
        for (const match of content.matchAll(/\b(?:pub\s+)?mod\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:;|{)/g)) {
            const offset = match.index ?? 0;
            const name = match[1];
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const hasBody = bodyStart >= 0 && match[0].includes('{');
            const bodyEnd = hasBody ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const symbol = this.symbol(context, 'namespace', name, `${rootModule.fullName}::${name}`, offset, rootModule.id, content, undefined, {
                declarationOnly: !hasBody
            });
            symbols.push(symbol);
            relations.push(this.contains(context, rootModule.id, symbol.id, 'declares module'));
            spans.push({ id: symbol.id, name, fullName: symbol.fullName ?? name, kind: 'namespace', bodyStart, bodyEnd });
        }
        return spans;
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        rootModule: MemorySymbol,
        moduleSpans: RustSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): RustSpan[] {
        const spans: RustSpan[] = [];
        const pattern = /\b(?:pub(?:\([^)]*\))?\s+)?(struct|enum|trait)\s+([A-Za-z_][A-Za-z0-9_]*)\b(?:[^;{=]*)[;{]/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const declarationKind = match[1];
            const kind: MemorySymbol['symbolKind'] = declarationKind === 'trait' ? 'interface' : declarationKind as MemorySymbol['symbolKind'];
            const name = match[2];
            const parent = this.parentAt(offset, moduleSpans) ?? rootModule;
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const hasBody = bodyStart >= 0 && match[0].includes('{');
            const bodyEnd = hasBody ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const symbol = this.symbol(context, kind, name, `${parent.fullName}::${name}`, offset, parent.id, content);
            symbols.push(symbol);
            relations.push(this.contains(context, parent.id, symbol.id, `declares ${declarationKind}`));
            spans.push({ id: symbol.id, name, fullName: symbol.fullName ?? name, kind, bodyStart, bodyEnd });

            if (hasBody && kind === 'struct') {
                this.extractStructFieldDependencies(content.slice(bodyStart + 1, bodyEnd), name, symbol.id, dependencyHints);
            }
        }
        return spans;
    }

    protected extractFunctions(
        context: LanguageAnalysisContext,
        content: string,
        rootModule: MemorySymbol,
        moduleSpans: RustSpan[],
        typeSpans: RustSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const implRanges = this.extractImplRanges(content, typeSpans, dependencyHints);
        const pattern = /\b(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>{}]*>)?\s*\(([^)]*)\)\s*(?:->\s*([^{;\n]+))?\s*(?:where\s+[^{]+)?[{;]/g;
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const implRange = implRanges.find(range => offset > range.bodyStart && offset < range.bodyEnd);
            const parent = implRange?.typeSpan ?? this.parentAt(offset, moduleSpans) ?? rootModule;
            const name = match[1];
            const kind: MemorySymbol['symbolKind'] = this.isTestFunction(content, offset, name) ? 'test_method' : 'method';
            const symbol = this.symbol(context, kind, name, `${parent.fullName}::${name}`, offset, parent.id, content, match[3]?.trim(), {
                parameters: this.parameterNames(match[2] ?? '')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, parent.id, symbol.id, `declares ${kind}`));
            this.extractParameterDependencies(match[2] ?? '', symbol.id, name, dependencyHints);
            this.extractBodyCalls(content, symbol.id, offset, callHints);
        }
    }

    protected extractImplRanges(content: string, typeSpans: RustSpan[], dependencyHints: LanguageDependencyHint[]): Array<{ bodyStart: number; bodyEnd: number; typeSpan?: RustSpan }> {
        const ranges: Array<{ bodyStart: number; bodyEnd: number; typeSpan?: RustSpan }> = [];
        for (const match of content.matchAll(/\bimpl(?:\s*<[^>{}]*>)?\s+(?:(?:[A-Za-z_][A-Za-z0-9_:<>]*)\s+for\s+)?([A-Za-z_][A-Za-z0-9_:<>]*)\s*{/g)) {
            const typeName = this.shortName(match[1]);
            const typeSpan = typeSpans.find(span => span.name === typeName);
            const bodyStart = content.indexOf('{', match.index ?? 0);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : match.index ?? 0;
            ranges.push({ bodyStart, bodyEnd, typeSpan });
            if (typeSpan && match[0].includes(' for ')) {
                const traitName = match[0].match(/\bimpl(?:\s*<[^>{}]*>)?\s+([A-Za-z_][A-Za-z0-9_:<>]*)\s+for\s+/)?.[1];
                if (traitName) {
                    dependencyHints.push({
                        sourceSymbolId: typeSpan.id,
                        targetTypeName: this.shortName(traitName),
                        evidence: `${typeName} implements ${traitName}`
                    });
                }
            }
        }
        return ranges;
    }

    protected extractStructFieldDependencies(body: string, structName: string, sourceSymbolId: string, dependencyHints: LanguageDependencyHint[]): void {
        for (const match of body.matchAll(/(?:^|,|\n)\s*(?:pub(?:\([^)]*\))?\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^,\n}]+)/g)) {
            const targetTypeName = this.shortName(match[2]);
            if (/^[A-Z]/.test(targetTypeName)) {
                dependencyHints.push({
                    sourceSymbolId,
                    targetTypeName,
                    parameterName: match[1],
                    evidence: `${structName} field ${match[1]}: ${match[2].trim()}`
                });
            }
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
        if (bodyStart < 0) {
            return;
        }
        const bodyEnd = this.findMatchingBrace(content, bodyStart);
        const body = content.slice(bodyStart + 1, bodyEnd);
        for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:::\s*([A-Za-z_][A-Za-z0-9_]*)|\.\s*([A-Za-z_][A-Za-z0-9_]*))?\s*!?\s*\(/g)) {
            const targetName = match[3] ?? match[2] ?? match[1];
            if (!CALL_KEYWORDS.has(targetName)) {
                callHints.push({ sourceSymbolId, targetName, evidence: `${targetName}(...)` });
            }
        }
    }

    protected isTestFunction(content: string, offset: number, name: string): boolean {
        const prefix = content.slice(Math.max(0, offset - 160), offset);
        return /#\s*\[\s*(?:tokio::test|async_std::test|test)\s*(?:\([^)]*\))?\s*\]\s*$/.test(prefix) || /^test_[A-Za-z0-9_]+/.test(name);
    }

    protected parentAt(offset: number, spans: RustSpan[]): RustSpan | undefined {
        return spans
            .filter(span => span.bodyStart >= 0 && offset > span.bodyStart && offset < span.bodyEnd)
            .sort((left, right) => right.bodyStart - left.bodyStart)[0];
    }

    protected parseParameters(parameters: string): Array<{ name: string; typeName: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim())
            .filter(parameter => parameter && parameter !== '&self' && parameter !== 'self' && parameter !== '&mut self')
            .map(parameter => {
                const match = parameter.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
                return match ? { name: match[1], typeName: match[2].trim() } : undefined;
            })
            .filter((parameter): parameter is { name: string; typeName: string } => !!parameter);
    }

    protected parameterNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.name);
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
        const normalized = typeName
            .replace(/^&\s*(?:mut\s+)?/, '')
            .replace(/\[[^\]]+\]/g, '')
            .trim();
        const generic = normalized.match(/<\s*([A-Za-z_][A-Za-z0-9_:]*)\s*>/);
        return (generic?.[1] ?? normalized)
            .replace(/<.*>$/, '')
            .split('::')
            .pop()
            ?.trim() ?? normalized;
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

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
    annotations: string[];
    baseTypes: string[];
    symbol: MemorySymbol;
}

const TYPE_MODIFIER = '(?:public|protected|private|abstract|static|final|sealed|non-sealed|strictfp)';
const MEMBER_MODIFIER = '(?:public|protected|private|abstract|static|final|synchronized|native|strictfp|default|transient|volatile)';
const PRIMITIVE_TYPES = new Set(['byte', 'short', 'int', 'long', 'float', 'double', 'boolean', 'char', 'void', 'String', 'Object']);
const CALL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'throw', 'new', 'super', 'this', 'assert', 'synchronized']);
const TEST_ANNOTATIONS = new Set(['Test', 'ParameterizedTest', 'RepeatedTest', 'TestFactory', 'TestTemplate']);
const HTTP_MAPPING_ANNOTATIONS = new Map<string, string>([
    ['GetMapping', 'GET'],
    ['PostMapping', 'POST'],
    ['PutMapping', 'PUT'],
    ['DeleteMapping', 'DELETE'],
    ['PatchMapping', 'PATCH']
]);

export class JavaStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'java-structural';
    readonly languageId = 'java';
    readonly priority = 5;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'java' || file.extension === '.java';
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const imports = this.extractImports(masked);
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const packageSymbol = this.extractPackage(context, masked, symbols);
        const typeSpans = this.extractTypes(context, masked, packageSymbol?.fullName, packageSymbol?.id, symbols, relations, dependencyHints);

        for (const typeSpan of typeSpans) {
            this.extractMembers(context, context.content, masked, typeSpan, typeSpans, symbols, relations, callHints, dependencyHints);
        }

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

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/^\s*import\s+(?:static\s+)?([A-Za-z_$][A-Za-z0-9_$.]*(?:\.\*)?)\s*;/gm)) {
            imports.add(match[1]);
        }
        return [...imports].sort();
    }

    protected extractPackage(context: LanguageAnalysisContext, content: string, symbols: MemorySymbol[]): MemorySymbol | undefined {
        const match = content.match(/\bpackage\s+([A-Za-z_$][A-Za-z0-9_$.]*)\s*;/);
        if (!match) {
            return undefined;
        }
        const name = match[1];
        const symbol: MemorySymbol = {
            id: context.createSymbolId(`package:${name}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: 'namespace',
            name,
            fullName: name,
            startLine: this.lineOf(content, match.index ?? 0),
            metadata: {
                analyzer: this.id,
                javaKind: 'package'
            }
        };
        symbols.push(symbol);
        return symbol;
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        packageName: string | undefined,
        packageId: string | undefined,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): TypeSpan[] {
        const typeSpans: TypeSpan[] = [];
        const pattern = new RegExp(`((?:\\s*@[^\\r\\n]+\\s*)*)((?:${TYPE_MODIFIER}\\s+)*)\\b(class|interface|record|enum)\\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\\s*<[^>{};]+>)?(?:\\s+extends\\s+([^\\r\\n{]+?))?(?:\\s+implements\\s+([^\\r\\n{]+?))?\\s*\\{`, 'g');
        for (const match of content.matchAll(pattern)) {
            const offset = match.index ?? 0;
            const parentType = this.deepestTypeAt(typeSpans, offset);
            const rawKind = match[3];
            const kind = rawKind as MemorySymbol['symbolKind'];
            const name = match[4];
            const bodyStart = content.indexOf('{', offset + match[0].length - 1);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const parentFullName = parentType?.fullName ?? packageName;
            const fullName = parentFullName ? `${parentFullName}.${name}` : name;
            const annotations = this.annotationsFrom(match[1] + this.leadingAnnotationBlock(content, offset));
            const baseTypes = [
                ...(match[5] ?? '').split(','),
                ...(match[6] ?? '').split(',')
            ].map(value => value.trim()).filter(Boolean);
            const id = context.createSymbolId(`${kind}:${fullName}:${offset}`);
            const symbol: MemorySymbol = {
                id,
                fileId: context.file.id,
                languageId: this.languageId,
                symbolKind: kind,
                name,
                fullName,
                parentSymbolId: parentType?.id ?? packageId,
                signature: this.signatureAt(content, offset),
                startLine: this.lineOf(content, offset),
                endLine: bodyEnd >= bodyStart ? this.lineOf(content, bodyEnd) : undefined,
                attributes: annotations,
                modifiers: this.words(match[2]),
                metadata: {
                    analyzer: this.id,
                    baseTypes,
                    isSpringComponent: annotations.some(annotation => ['Component', 'Service', 'Repository', 'Controller', 'RestController', 'Configuration'].includes(annotation)),
                    isSpringController: annotations.some(annotation => ['Controller', 'RestController'].includes(annotation)),
                    isJpaEntity: annotations.some(annotation => ['Entity', 'MappedSuperclass', 'Embeddable'].includes(annotation))
                }
            };
            symbols.push(symbol);
            if (symbol.parentSymbolId) {
                relations.push(this.contains(context, symbol.parentSymbolId, symbol.id, 'declares type'));
            }
            for (const baseType of baseTypes) {
                dependencyHints.push({
                    sourceSymbolId: id,
                    targetTypeName: this.shortName(baseType),
                    evidence: `${name} depends on ${baseType}`
                });
            }
            typeSpans.push({ id, name, fullName, kind, bodyStart, bodyEnd, annotations, baseTypes, symbol });
        }
        return typeSpans;
    }

    protected extractMembers(
        context: LanguageAnalysisContext,
        rawContent: string,
        content: string,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        if (typeSpan.bodyStart < 0 || typeSpan.bodyEnd <= typeSpan.bodyStart) {
            return;
        }
        const body = content.slice(typeSpan.bodyStart + 1, typeSpan.bodyEnd);
        const baseOffset = typeSpan.bodyStart + 1;
        this.extractConstructors(context, rawContent, content, body, baseOffset, typeSpan, allTypes, symbols, relations, callHints, dependencyHints);
        this.extractMethods(context, rawContent, content, body, baseOffset, typeSpan, allTypes, symbols, relations, callHints, dependencyHints);
        this.extractFields(context, content, body, baseOffset, typeSpan, allTypes, symbols, relations, dependencyHints);
    }

    protected extractConstructors(
        context: LanguageAnalysisContext,
        rawContent: string,
        content: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = new RegExp(`((?:\\s*@[^\\r\\n]+\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)\\b${typeSpan.name}\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^\\r\\n{]+)?\\s*(?:\\{|;)`, 'g');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id) {
                continue;
            }
            const symbol = this.memberSymbol(context, content, typeSpan, 'constructor', typeSpan.name, offset, match[0], undefined, match[1], match[2], {
                parameters: this.parameterTypeNames(match[3] ?? '')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'declares constructor'));
            this.extractBodyCalls(content, symbol.id, offset, callHints);
            this.addParameterDependencies(typeSpan.id, symbol.id, typeSpan.name, match[3] ?? '', dependencyHints);
        }
    }

    protected extractMethods(
        context: LanguageAnalysisContext,
        rawContent: string,
        content: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = new RegExp(`((?:\\s*@[^\\r\\n]+\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)\\b([A-Za-z_$][A-Za-z0-9_$.<>?,\\[\\]]*)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^\\r\\n{]+)?\\s*(?:\\{|;)`, 'g');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            const name = match[4];
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id || CALL_KEYWORDS.has(name) || name === typeSpan.name) {
                continue;
            }
            const rawAnnotations = this.leadingAnnotationBlock(rawContent, offset) + rawContent.slice(offset, offset + match[1].length);
            const annotations = this.annotationsFrom(match[1] + this.leadingAnnotationBlock(content, offset));
            const endpoint = this.endpointMetadata(typeSpan, annotations, rawAnnotations);
            const isTest = annotations.some(annotation => TEST_ANNOTATIONS.has(annotation));
            const kind: MemorySymbol['symbolKind'] = isTest ? 'test_method' : endpoint ? 'endpoint' : 'method';
            const symbol = this.memberSymbol(context, content, typeSpan, kind, name, offset, match[0], match[3], match[1], match[2], {
                parameters: this.parameterTypeNames(match[5] ?? ''),
                httpMethods: endpoint?.methods ?? [],
                route: endpoint?.route ?? '',
                framework: endpoint?.framework ?? '',
                isSpringHandler: endpoint?.framework === 'spring-mvc',
                isJaxRsResource: endpoint?.framework === 'jax-rs'
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, `declares ${kind}`));
            this.extractBodyCalls(content, symbol.id, offset, callHints);
            this.addParameterDependencies(typeSpan.id, symbol.id, name, match[5] ?? '', dependencyHints);
        }
    }

    protected extractFields(
        context: LanguageAnalysisContext,
        content: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = new RegExp(`^\\s*((?:@[^\\r\\n]+\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)\\b([A-Za-z_$][A-Za-z0-9_$.<>?,\\[\\]]*)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*(?:=[^;]+)?;`, 'gm');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id) {
                continue;
            }
            const typeName = match[3];
            const name = match[4];
            const annotations = this.annotationsFrom(match[1] + this.leadingAnnotationBlock(content, offset));
            const symbol = this.memberSymbol(context, content, typeSpan, 'field', name, offset, match[0], typeName, match[1], match[2], {
                isInjected: annotations.some(annotation => ['Autowired', 'Inject', 'Resource'].includes(annotation)),
                isJpaId: annotations.includes('Id')
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'declares field'));
            const shortType = this.shortName(typeName);
            if (!PRIMITIVE_TYPES.has(shortType)) {
                dependencyHints.push({
                    sourceSymbolId: typeSpan.id,
                    targetTypeName: shortType,
                    evidence: `${typeSpan.name} field ${name}: ${typeName}`
                });
            }
        }
    }

    protected memberSymbol(
        context: LanguageAnalysisContext,
        content: string,
        typeSpan: TypeSpan,
        kind: MemorySymbol['symbolKind'],
        name: string,
        offset: number,
        rawSignature: string,
        returnType: string | undefined,
        rawAnnotations: string,
        rawModifiers: string,
        metadata: Record<string, string | number | boolean | string[]> = {}
    ): MemorySymbol {
        return {
            id: context.createSymbolId(`${kind}:${typeSpan.fullName}.${name}:${offset}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: kind,
            name,
            fullName: `${typeSpan.fullName}.${name}`,
            parentSymbolId: typeSpan.id,
            signature: rawSignature.replace(/\s+/g, ' ').replace(/\s*\{\s*$/, '').trim(),
            startLine: this.lineOf(content, offset),
            returnType,
            attributes: this.annotationsFrom(rawAnnotations + this.leadingAnnotationBlock(content, offset)),
            modifiers: this.words(rawModifiers),
            metadata: {
                analyzer: this.id,
                declaringType: typeSpan.fullName,
                ...metadata
            }
        };
    }

    protected endpointMetadata(typeSpan: TypeSpan, annotations: string[], rawAnnotations: string): { methods: string[]; route: string; framework: string } | undefined {
        const springMethods: string[] = [];
        for (const annotation of annotations) {
            const mapped = HTTP_MAPPING_ANNOTATIONS.get(annotation);
            if (mapped) {
                springMethods.push(mapped);
            }
        }
        if (annotations.includes('RequestMapping') || springMethods.length) {
            const requestMethods = [...rawAnnotations.matchAll(/\bRequestMethod\.([A-Z]+)/g)].map(match => match[1]);
            return {
                methods: springMethods.length ? springMethods : requestMethods.length ? requestMethods : ['ANY'],
                route: this.annotationRoute(rawAnnotations),
                framework: 'spring-mvc'
            };
        }
        const jaxRsMethods = annotations.filter(annotation => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(annotation));
        if (jaxRsMethods.length || typeSpan.annotations.includes('Path')) {
            return {
                methods: jaxRsMethods.length ? jaxRsMethods : ['ANY'],
                route: this.annotationRoute(rawAnnotations),
                framework: 'jax-rs'
            };
        }
        return undefined;
    }

    protected annotationRoute(rawAnnotations: string): string {
        const routes = [...rawAnnotations.matchAll(/@\w+(?:Mapping|Path)?\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"/g)]
            .map(match => match[1])
            .filter(Boolean);
        return routes[routes.length - 1] ?? '';
    }

    protected addParameterDependencies(
        sourceSymbolId: string,
        sourceConstructorSymbolId: string | undefined,
        methodName: string,
        parameters: string,
        dependencyHints: LanguageDependencyHint[]
    ): void {
        for (const parameter of this.parseParameters(parameters)) {
            const shortType = this.shortName(parameter.typeName);
            if (shortType && !PRIMITIVE_TYPES.has(shortType)) {
                dependencyHints.push({
                    sourceSymbolId,
                    sourceConstructorSymbolId,
                    targetTypeName: shortType,
                    parameterName: parameter.name,
                    evidence: `${methodName} parameter ${parameter.name}: ${parameter.typeName}`
                });
            }
        }
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
            if (!CALL_KEYWORDS.has(targetName)) {
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
            .map(parameter => parameter.replace(/^@\w+(?:\([^)]*\))?\s+/, '').replace(/\s*=\s*.+$/, ''))
            .map(parameter => {
                const parts = parameter.replace(/\b(final|var)\s+/, '').trim().split(/\s+/);
                return {
                    typeName: parts.slice(0, -1).join(' '),
                    name: parts[parts.length - 1] ?? ''
                };
            })
            .filter(parameter => parameter.typeName && parameter.name);
    }

    protected parameterTypeNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.typeName);
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

    protected leadingAnnotationBlock(content: string, offset: number): string {
        const prefix = content.slice(Math.max(0, offset - 900), offset);
        const match = prefix.match(/((?:^\s*@[^\r\n]+\s*$\r?\n?)+)\s*$/m);
        return match?.[1] ?? '';
    }

    protected annotationsFrom(raw: string): string[] {
        return [...new Set([...raw.matchAll(/@([A-Za-z_$][A-Za-z0-9_$.]*)/g)].map(match => this.shortName(match[1])))];
    }

    protected signatureAt(content: string, offset: number): string {
        const tail = content.slice(offset, Math.min(content.length, offset + 400));
        const end = tail.search(/[{\r\n;]/);
        return tail.slice(0, end >= 0 ? end : tail.length).replace(/\s+/g, ' ').trim();
    }

    protected words(value: string | undefined): string[] {
        return (value ?? '').trim().split(/\s+/).filter(Boolean);
    }

    protected shortName(typeName: string): string {
        return typeName.replace(/\?.*$/, '').replace(/<.*$/, '').replace(/\[\]$/, '').split('.').pop()?.trim() ?? typeName.trim();
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
            if (current === '"' || current === '\'') {
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

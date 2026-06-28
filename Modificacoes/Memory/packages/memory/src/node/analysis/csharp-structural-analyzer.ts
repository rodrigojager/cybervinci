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
    attributes: string[];
    routePrefix?: string;
    filters: string[];
    baseTypes: string[];
    symbol: MemorySymbol;
}

const MEMBER_MODIFIER = '(?:public|private|protected|internal|static|async|virtual|override|sealed|abstract|partial|readonly|required|new|extern|unsafe)';
const TYPE_MODIFIER = '(?:public|private|protected|internal|static|abstract|sealed|partial|readonly|ref|file|new)';
const PRIMITIVE_TYPES = new Set(['string', 'int', 'long', 'short', 'byte', 'bool', 'double', 'decimal', 'float', 'char', 'object', 'Guid', 'DateTime', 'DateOnly', 'TimeSpan', 'CancellationToken']);
const CALL_KEYWORDS = new Set(['if', 'for', 'foreach', 'while', 'switch', 'catch', 'using', 'lock', 'return', 'throw', 'new', 'nameof', 'typeof', 'sizeof', 'default', 'await', 'checked', 'unchecked']);
const TEST_ATTRIBUTES = new Set(['Fact', 'Theory', 'Test', 'TestCase', 'TestMethod', 'DataTestMethod']);
const STRUCTURAL_FALLBACK_CONFIDENCE_SCORE = 0.45;
const STRUCTURAL_FALLBACK_METADATA = {
    analyzer: 'csharp-structural-fallback',
    analysisMode: 'structural-fallback',
    confidenceLevel: 'low',
    extractionSource: 'heuristic'
};

export class CSharpStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'csharp-structural-fallback';
    readonly languageId = 'csharp';
    readonly priority = 0;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return file.languageId === 'csharp' || file.extension === '.cs';
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const masked = this.maskTrivia(context.content);
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const imports = this.extractImports(masked);
        const callHints: LanguageCallHint[] = [];
        const dependencyHints: LanguageDependencyHint[] = [];
        const namespaceSymbol = this.extractNamespace(context, masked, symbols);
        const namespaceName = namespaceSymbol?.fullName;
        const typeSpans = this.extractTypes(context, masked, namespaceName, namespaceSymbol?.id, symbols, relations);

        for (const typeSpan of typeSpans) {
            this.extractMembers(context, masked, typeSpan, typeSpans, symbols, relations, callHints, dependencyHints);
        }

        return {
            fileId: context.file.id,
            languageId: this.languageId,
            analyzerId: this.id,
            symbols,
            relations,
            imports,
            callHints,
            dependencyHints,
            diagnostics: [{
                id: 'csharp-structural-fallback-low-confidence',
                severity: 'info',
                message: 'C# analysis is using structural fallback mode; semantic confidence is low until Roslyn is available.',
                path: context.file.relativePath
            }]
        };
    }

    protected extractImports(content: string): string[] {
        const imports = new Set<string>();
        for (const match of content.matchAll(/^\s*using\s+(?:static\s+)?(?:[A-Za-z_][A-Za-z0-9_]*\s*=\s*)?([A-Za-z_][A-Za-z0-9_.]*)\s*;/gm)) {
            imports.add(match[1]);
        }
        return [...imports].sort();
    }

    protected extractNamespace(context: LanguageAnalysisContext, content: string, symbols: MemorySymbol[]): MemorySymbol | undefined {
        const match = content.match(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)\s*(?:[;{])/);
        if (!match) {
            return undefined;
        }
        const name = match[1];
        const symbol: MemorySymbol = {
            id: context.createSymbolId(`namespace:${name}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: 'namespace',
            name,
            fullName: name,
            startLine: this.lineOf(content, match.index ?? 0),
            metadata: {
                ...STRUCTURAL_FALLBACK_METADATA
            }
        };
        symbols.push(symbol);
        return symbol;
    }

    protected extractTypes(
        context: LanguageAnalysisContext,
        content: string,
        namespaceName: string | undefined,
        namespaceId: string | undefined,
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): TypeSpan[] {
        const typeSpans: TypeSpan[] = [];
        const typePattern = new RegExp(`((?:\\s*\\[[^\\]]+\\]\\s*)*)((?:${TYPE_MODIFIER}\\s+)*)\\b(class|interface|record|struct|enum)\\s+([A-Za-z_][A-Za-z0-9_]*)(?:\\s*<[^>{};]+>)?(?:\\s*:\\s*([^\\r\\n{;]+))?`, 'g');
        for (const match of content.matchAll(typePattern)) {
            const offset = match.index ?? 0;
            const parentType = this.deepestTypeAt(typeSpans, offset);
            const kind = match[3] as MemorySymbol['symbolKind'];
            const name = match[4];
            const baseTypes = this.splitTypeList(match[5] ?? '');
            const rawTypeAttributes = this.rawAttributesAt(context.content, offset, match[0].length, match[1]);
            const attributes = this.attributesFrom(rawTypeAttributes);
            const routePrefix = this.routeFromAttributes(rawTypeAttributes);
            const filters = this.filterAttributes(attributes);
            const modifiers = this.words(match[2]);
            const bodyStart = content.indexOf('{', offset + match[0].length);
            const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(content, bodyStart) : offset + match[0].length;
            const parentFullName = parentType?.fullName ?? namespaceName;
            const fullName = parentFullName ? `${parentFullName}.${name}` : name;
            const id = context.createSymbolId(`${kind}:${fullName}:${offset}`);
            const isDbContext = baseTypes.some(base => this.shortName(base) === 'DbContext');
            const isController = this.isController(name, baseTypes, attributes);
            const isEntityCandidate = this.isEntityCandidate(kind, attributes, content.slice(bodyStart, Math.max(bodyStart, bodyEnd)));
            const isTestClass = this.isTestClass(name, attributes);
            const symbol: MemorySymbol = {
                id,
                fileId: context.file.id,
                languageId: this.languageId,
                symbolKind: kind,
                name,
                fullName,
                parentSymbolId: parentType?.id ?? namespaceId,
                signature: this.signatureAt(content, offset),
                startLine: this.lineOf(content, offset),
                endLine: bodyEnd >= bodyStart ? this.lineOf(content, bodyEnd) : undefined,
                attributes,
                modifiers,
                metadata: {
                    ...STRUCTURAL_FALLBACK_METADATA,
                    baseTypes,
                    routePrefix: routePrefix ?? '',
                    filters,
                    normalizedSymbolKind: this.normalizedTypeKind(kind, isController, isDbContext, isEntityCandidate, isTestClass),
                    isAspNetController: isController,
                    isDbContext,
                    isEfEntityCandidate: isEntityCandidate,
                    isEntityCandidate,
                    isTestClass
                }
            };
            symbols.push(symbol);
            if (symbol.parentSymbolId) {
                relations.push(this.contains(context, symbol.parentSymbolId, symbol.id, 'symbol', 'symbol', `declares ${kind}`));
            }
            typeSpans.push({
                id,
                name,
                fullName,
                kind,
                bodyStart,
                bodyEnd,
                attributes,
                routePrefix,
                filters,
                baseTypes,
                symbol
            });
        }
        for (const typeSpan of typeSpans) {
            for (const baseType of typeSpan.baseTypes) {
                const target = typeSpans.find(type => type.id !== typeSpan.id && (type.name === this.shortName(baseType) || type.fullName === baseType));
                if (target) {
                    relations.push(this.semanticRelation(
                        context,
                        typeSpan.id,
                        target.id,
                        target.kind === 'interface' ? 'implements' : 'inherits',
                        `${typeSpan.name} ${target.kind === 'interface' ? 'implements' : 'inherits'} ${baseType}`
                    ));
                }
            }
        }
        return typeSpans;
    }

    protected extractMembers(
        context: LanguageAnalysisContext,
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
        this.extractConstructors(context, content, body, baseOffset, typeSpan, allTypes, symbols, relations, callHints, dependencyHints);
        this.extractMethods(context, content, body, baseOffset, typeSpan, allTypes, symbols, relations, callHints);
        this.extractProperties(context, content, body, baseOffset, typeSpan, allTypes, symbols, relations);
        this.extractFields(context, content, body, baseOffset, typeSpan, allTypes, symbols, relations);
    }

    protected extractConstructors(
        context: LanguageAnalysisContext,
        fullContent: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[],
        dependencyHints: LanguageDependencyHint[]
    ): void {
        const pattern = new RegExp(`((?:\\s*\\[[^\\]]+\\]\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)\\b${typeSpan.name}\\s*\\(([^)]*)\\)\\s*(?::\\s*(?:base|this)\\s*\\([^)]*\\)\\s*)?(?:\\{|=>|;)`, 'g');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id) {
                continue;
            }
            const parameters = match[3] ?? '';
            const symbol = this.memberSymbol(context, fullContent, typeSpan, 'constructor', typeSpan.name, offset, match[0], undefined, match[1], match[2], {
                parameters: this.parameterTypeNames(parameters)
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'symbol', 'symbol', 'declares constructor'));
            this.extractBodyCalls(fullContent, symbol.id, offset, callHints);
            for (const parameter of this.parseParameters(parameters)) {
                if (parameter.typeName && !PRIMITIVE_TYPES.has(this.shortName(parameter.typeName))) {
                    dependencyHints.push({
                        sourceSymbolId: typeSpan.id,
                        sourceConstructorSymbolId: symbol.id,
                        targetTypeName: parameter.typeName,
                        parameterName: parameter.name,
                        evidence: `${typeSpan.name} constructor parameter ${parameter.name}: ${parameter.typeName}`
                    });
                }
            }
        }
    }

    protected extractMethods(
        context: LanguageAnalysisContext,
        fullContent: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        callHints: LanguageCallHint[]
    ): void {
        const pattern = new RegExp(`((?:\\s*\\[[^\\]]+\\]\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)([A-Za-z_][A-Za-z0-9_<>,.?\\[\\]]*)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\(([^)]*)\\)\\s*(?:where\\s+[^\\r\\n{;=>]+\\s*)?(?:\\{|=>|;)`, 'g');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id || match[4] === typeSpan.name || CALL_KEYWORDS.has(match[4])) {
                continue;
            }
            const rawAttributes = this.rawAttributesAt(context.content, offset, match[0].length, match[1]);
            const attributes = this.attributesFrom(rawAttributes);
            const returnType = match[3];
            const isTest = this.isTestMethod(typeSpan, attributes);
            const endpoint = this.endpointMetadata(typeSpan, attributes, returnType, rawAttributes);
            const kind: MemorySymbol['symbolKind'] = isTest ? 'test_method' : endpoint ? 'endpoint' : 'method';
            const symbol = this.memberSymbol(context, fullContent, typeSpan, kind, match[4], offset, match[0], returnType, match[1], match[2], {
                normalizedSymbolKind: isTest ? 'test_method' : endpoint ? 'controller_action' : 'method',
                parameters: this.parameterTypeNames(match[5] ?? ''),
                parameterNames: this.parameterNames(match[5] ?? ''),
                parameterBindings: this.parameterBindings(match[5] ?? ''),
                httpMethods: endpoint?.methods ?? [],
                route: endpoint?.route ?? '',
                routePrefix: typeSpan.routePrefix ?? '',
                filters: [...typeSpan.filters, ...this.filterAttributes(attributes)],
                isAspNetAction: endpoint !== undefined
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'symbol', 'symbol', `declares ${kind}`));
            if (isTest) {
                this.addInferredTestTargetRelations(context, symbol, typeSpan, allTypes, relations);
            }
            this.extractBodyCalls(fullContent, symbol.id, offset, callHints);
        }
    }

    protected extractProperties(
        context: LanguageAnalysisContext,
        fullContent: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): void {
        const pattern = new RegExp(`((?:\\s*\\[[^\\]]+\\]\\s*)*)((?:${MEMBER_MODIFIER}\\s+)*)([A-Za-z_][A-Za-z0-9_<>,.?\\[\\]]*)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(?:\\{[^{}]*(?:get|set|init)[^{}]*\\}|=>)`, 'g');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id) {
                continue;
            }
            const typeName = match[3];
            const attributes = this.attributesFrom(match[1] + this.leadingAttributeBlock(fullContent, offset));
            const dbSetEntityType = this.dbSetEntityType(typeName);
            const dbSetEntity = dbSetEntityType ? this.findEntityType(allTypes, dbSetEntityType) : undefined;
            const symbol = this.memberSymbol(context, fullContent, typeSpan, 'property', match[4], offset, match[0], typeName, match[1], match[2], {
                isDbSet: dbSetEntityType !== undefined,
                efEntityType: dbSetEntityType ?? '',
                efEntitySymbolId: dbSetEntity?.id ?? '',
                efEntityFullName: dbSetEntity?.fullName ?? dbSetEntityType ?? '',
                isEntityKey: attributes.includes('Key') || match[4] === 'Id' || match[4] === `${typeSpan.name}Id`
            });
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'symbol', 'symbol', 'declares property'));
            if (dbSetEntityType) {
                const targetId = dbSetEntity?.id ?? context.createSymbolId(`entity:${dbSetEntityType}`);
                relations.push(this.semanticRelation(context, symbol.id, targetId, 'uses_entity', `DbSet ${symbol.name} maps entity ${dbSetEntityType}`));
                if (typeSpan.symbol.metadata?.isDbContext === true) {
                    relations.push(this.semanticRelation(context, typeSpan.id, targetId, 'uses_entity', `DbContext ${typeSpan.name} exposes DbSet ${symbol.name} for ${dbSetEntityType}`));
                }
            }
        }
    }

    protected extractFields(
        context: LanguageAnalysisContext,
        fullContent: string,
        body: string,
        baseOffset: number,
        typeSpan: TypeSpan,
        allTypes: TypeSpan[],
        symbols: MemorySymbol[],
        relations: MemoryRelation[]
    ): void {
        const pattern = new RegExp(`^\\s*((?:${MEMBER_MODIFIER}\\s+)*)([A-Za-z_][A-Za-z0-9_<>,.?\\[\\]]*)\\s+([A-Za-z_][A-Za-z0-9_]*)(?:\\s*=\\s*[^;]+)?;`, 'gm');
        for (const match of body.matchAll(pattern)) {
            const offset = baseOffset + (match.index ?? 0);
            if (this.deepestTypeAt(allTypes, offset)?.id !== typeSpan.id || ['return', 'throw', 'using'].includes(match[2])) {
                continue;
            }
            const symbol = this.memberSymbol(context, fullContent, typeSpan, 'field', match[3], offset, match[0], match[2], '', match[1]);
            symbols.push(symbol);
            relations.push(this.contains(context, typeSpan.id, symbol.id, 'symbol', 'symbol', 'declares field'));
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
        rawAttributes: string,
        rawModifiers: string,
        metadata: Record<string, string | number | boolean | string[]> = {}
    ): MemorySymbol {
        const attributes = this.attributesFrom(rawAttributes + this.leadingAttributeBlock(content, offset));
        return {
            id: context.createSymbolId(`${kind}:${typeSpan.fullName}.${name}:${offset}`),
            fileId: context.file.id,
            languageId: this.languageId,
            symbolKind: kind,
            name,
            fullName: `${typeSpan.fullName}.${name}`,
            parentSymbolId: typeSpan.id,
            signature: rawSignature.replace(/\s+/g, ' ').replace(/\s*(\{|=>)\s*$/, '').trim(),
            startLine: this.lineOf(content, offset),
            returnType,
            attributes,
            modifiers: this.words(rawModifiers),
            metadata: {
                ...STRUCTURAL_FALLBACK_METADATA,
                declaringType: typeSpan.fullName,
                ...metadata
            }
        };
    }

    protected contains(
        context: LanguageAnalysisContext,
        sourceId: string,
        targetId: string,
        sourceKind: MemoryRelation['sourceKind'],
        targetKind: MemoryRelation['targetKind'],
        evidence: string
    ): MemoryRelation {
        return {
            id: context.createRelationId(`contains:${sourceId}:${targetId}`),
            sourceKind,
            sourceId,
            targetKind,
            targetId,
            relationType: 'contains',
            confidenceLevel: 'inferred',
            confidenceScore: STRUCTURAL_FALLBACK_CONFIDENCE_SCORE,
            evidence,
            metadata: {
                analysisMode: 'structural-fallback',
                confidenceLevel: 'low',
                extractionSource: 'heuristic'
            }
        };
    }

    protected semanticRelation(
        context: LanguageAnalysisContext,
        sourceId: string,
        targetId: string,
        relationType: MemoryRelation['relationType'],
        evidence: string
    ): MemoryRelation {
        return {
            id: context.createRelationId(`${relationType}:${sourceId}:${targetId}`),
            sourceKind: 'symbol',
            sourceId,
            targetKind: 'symbol',
            targetId,
            relationType,
            confidenceLevel: 'inferred',
            confidenceScore: STRUCTURAL_FALLBACK_CONFIDENCE_SCORE,
            evidence,
            metadata: {
                analysisMode: 'structural-fallback',
                confidenceLevel: 'low',
                extractionSource: 'heuristic'
            }
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
        for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*\(/g)) {
            const targetName = match[1];
            if (!CALL_KEYWORDS.has(targetName)) {
                callHints.push({
                    sourceSymbolId,
                    targetName,
                    evidence: `${targetName}(...)`
                });
            }
        }
    }

    protected endpointMetadata(typeSpan: TypeSpan, attributes: string[], returnType: string, rawAttributes: string): { methods: string[]; route?: string } | undefined {
        const methods = attributes
            .map(attribute => attribute.match(/^Http(Get|Post|Put|Delete|Patch|Head|Options)/)?.[1]?.toUpperCase())
            .filter((method): method is string => method !== undefined);
        const actionRoute = this.routeFromAttributes(rawAttributes);
        const route = this.combineRoutes(typeSpan.routePrefix, actionRoute);
        const actionReturn = /\b(?:IActionResult|ActionResult|IResult|Task<\s*(?:IActionResult|ActionResult|IResult))/.test(returnType);
        if (methods.length || (this.isController(typeSpan.name, typeSpan.baseTypes, typeSpan.attributes) && actionReturn)) {
            return { methods: methods.length ? methods : ['ANY'], route };
        }
        return undefined;
    }

    protected isController(name: string, baseTypes: string[], attributes: string[]): boolean {
        return name.endsWith('Controller')
            || attributes.includes('ApiController')
            || baseTypes.some(base => ['Controller', 'ControllerBase'].includes(this.shortName(base)));
    }

    protected isTestMethod(typeSpan: TypeSpan, attributes: string[]): boolean {
        return attributes.some(attribute => TEST_ATTRIBUTES.has(this.shortName(attribute)))
            || this.isTestClass(typeSpan.name, typeSpan.attributes);
    }

    protected isTestClass(name: string, attributes: string[]): boolean {
        return attributes.some(attribute => ['TestClass', 'TestFixture'].includes(this.shortName(attribute)))
            || /(?:Tests?|Specs?)$/.test(name);
    }

    protected normalizedTypeKind(
        kind: MemorySymbol['symbolKind'],
        isController: boolean,
        isDbContext: boolean,
        isEntityCandidate: boolean,
        isTestClass: boolean
    ): string {
        if (isController) {
            return 'controller';
        }
        if (isDbContext) {
            return 'db_context';
        }
        if (isEntityCandidate) {
            return 'entity';
        }
        if (isTestClass) {
            return 'test_class';
        }
        return kind;
    }

    protected addInferredTestTargetRelations(
        context: LanguageAnalysisContext,
        testSymbol: MemorySymbol,
        testType: TypeSpan,
        allTypes: TypeSpan[],
        relations: MemoryRelation[]
    ): void {
        const targetTypeName = this.inferTestedTypeName(testType.name);
        if (!targetTypeName) {
            return;
        }
        const target = allTypes.find(type => type.id !== testType.id && (type.name === targetTypeName || type.fullName.endsWith(`.${targetTypeName}`)));
        if (!target) {
            return;
        }
        relations.push(this.inferredTestRelation(context, testSymbol.id, target.id, 'tests', `${testSymbol.name} is declared in ${testType.name}, which matches ${target.name}`));
        relations.push(this.inferredTestRelation(context, target.id, testSymbol.id, 'tested_by', `${target.name} is matched by test fixture ${testType.name}`));
    }

    protected inferTestedTypeName(testTypeName: string): string | undefined {
        const match = testTypeName.match(/^(.+?)(?:Tests?|Specs?|Should)$/);
        return match?.[1] && match[1] !== testTypeName ? match[1] : undefined;
    }

    protected inferredTestRelation(
        context: LanguageAnalysisContext,
        sourceId: string,
        targetId: string,
        relationType: MemoryRelation['relationType'],
        evidence: string
    ): MemoryRelation {
        return {
            id: context.createRelationId(`${relationType}:${sourceId}:${targetId}`),
            sourceKind: 'symbol',
            sourceId,
            targetKind: 'symbol',
            targetId,
            relationType,
            confidenceLevel: 'inferred',
            confidenceScore: STRUCTURAL_FALLBACK_CONFIDENCE_SCORE,
            evidence,
            metadata: {
                analysisMode: 'structural-fallback',
                confidenceLevel: 'low',
                extractionSource: 'heuristic'
            }
        };
    }

    protected isEntityCandidate(kind: MemorySymbol['symbolKind'], attributes: string[], body: string): boolean {
        return (kind === 'class' || kind === 'record')
            && (attributes.some(attribute => ['Table', 'Owned', 'Keyless'].includes(this.shortName(attribute)))
                || /\b(?:public|internal)\s+[A-Za-z_][A-Za-z0-9_<>,.?[\]]*\s+(?:Id|[A-Za-z_][A-Za-z0-9_]*Id)\s*\{/.test(body));
    }

    protected dbSetEntityType(typeName: string): string | undefined {
        const match = typeName.match(/(?:^|[.])DbSet\s*<\s*([^>]+)\s*>/);
        return match?.[1]?.trim();
    }

    protected findEntityType(types: TypeSpan[], entityTypeName: string): TypeSpan | undefined {
        const shortEntityName = this.shortName(entityTypeName);
        return types.find(type => type.fullName === entityTypeName || type.name === shortEntityName);
    }

    protected parseParameters(parameters: string): Array<{ typeName: string; name: string }> {
        return parameters
            .split(',')
            .map(parameter => parameter.trim())
            .filter(parameter => parameter.length > 0)
            .map(parameter => parameter.replace(/^(?:this|ref|out|in|params)\s+/, '').replace(/\s*=\s*.+$/, ''))
            .map(parameter => {
                const bindingPrefix = parameter.match(/^((?:\[[^\]]+\]\s*)+)/)?.[1] ?? '';
                const parts = parameter.slice(bindingPrefix.length).split(/\s+/);
                return {
                    typeName: `${bindingPrefix}${parts.slice(0, -1).join(' ')}`.trim(),
                    name: parts[parts.length - 1] ?? ''
                };
            })
            .filter(parameter => parameter.typeName.length > 0 && parameter.name.length > 0);
    }

    protected parameterTypeNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.typeName.replace(/^(?:\[[^\]]+\]\s*)+/, ''));
    }

    protected parameterNames(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => parameter.name);
    }

    protected parameterBindings(parameters: string): string[] {
        return this.parseParameters(parameters).map(parameter => {
            const binding = parameter.typeName.match(/\[(From[A-Za-z]+)(?:Attribute)?(?:\([^)]*\))?\]\s*(.+)$/);
            return binding ? `${parameter.name}:${binding[1]}` : `${parameter.name}:default`;
        });
    }

    protected routeFromAttributes(rawAttributes: string): string | undefined {
        return [...rawAttributes.matchAll(/\[(?:Route|Http(?:Get|Post|Put|Delete|Patch|Head|Options))(?:Attribute)?\s*(?:\(\s*["']([^"']+)["'])?/g)]
            .map(match => match[1]?.trim())
            .find((candidate): candidate is string => !!candidate);
    }

    protected rawAttributesAt(originalContent: string, offset: number, matchLength: number, fallbackAttributes: string): string {
        const originalMatch = originalContent.slice(offset, offset + matchLength);
        const leadingAttributes = originalMatch.match(/^((?:\s*\[[^\]]+\]\s*)*)/)?.[1];
        return `${leadingAttributes ?? fallbackAttributes}${this.leadingAttributeBlock(originalContent, offset)}`;
    }

    protected combineRoutes(prefix: string | undefined, route: string | undefined): string | undefined {
        if (!prefix) {
            return route;
        }
        if (!route) {
            return prefix;
        }
        if (route.startsWith('/') || route.startsWith('~/')) {
            return route;
        }
        return `${prefix.replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
    }

    protected filterAttributes(attributes: string[]): string[] {
        const nonFilterAttributes = new Set(['ApiController', 'Route', 'HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpPatch', 'HttpHead', 'HttpOptions']);
        return attributes.filter(attribute =>
            !nonFilterAttributes.has(attribute)
            && (attribute.endsWith('Filter')
                || attribute.endsWith('Authorization')
                || ['Authorize', 'AllowAnonymous', 'ValidateAntiForgeryToken', 'AutoValidateAntiforgeryToken', 'IgnoreAntiforgeryToken', 'ServiceFilter', 'TypeFilter', 'MiddlewareFilter', 'ResponseCache', 'Produces', 'Consumes'].includes(attribute))
        );
    }

    protected splitTypeList(baseList: string): string[] {
        return baseList
            .split(',')
            .map(value => value.trim().replace(/\s+where\s+.+$/, ''))
            .filter(value => value.length > 0);
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

    protected leadingAttributeBlock(content: string, offset: number): string {
        const prefix = content.slice(Math.max(0, offset - 700), offset);
        const lines = prefix.split(/\r?\n/);
        const attributes: string[] = [];
        for (let index = lines.length - 1; index >= 0; index--) {
            const line = lines[index].trim();
            if (!line) {
                if (attributes.length) {
                    break;
                }
                continue;
            }
            if (/^(?:public|private|protected|internal|static|abstract|sealed|partial|readonly|ref|file|new|async|virtual|override|required|extern|unsafe)(?:\s+(?:public|private|protected|internal|static|abstract|sealed|partial|readonly|ref|file|new|async|virtual|override|required|extern|unsafe))*$/.test(line)) {
                continue;
            }
            if (/^\[[^\]]+\]$/.test(line)) {
                attributes.unshift(lines[index]);
                continue;
            }
            break;
        }
        return attributes.length ? `${attributes.join('\n')}\n` : '';
    }

    protected attributesFrom(raw: string): string[] {
        const attributes = new Set<string>();
        for (const match of raw.matchAll(/\[([^\]]+)\]/g)) {
            for (const attribute of match[1].split(',').map(value => value.trim()).filter(Boolean)) {
                const name = attribute.replace(/\(.+$/, '').replace(/Attribute$/, '').trim();
                if (name) {
                    attributes.add(this.shortName(name));
                }
            }
        }
        return [...attributes];
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

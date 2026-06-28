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

declare const require: (id: string) => unknown;

type TreeSitterConfidence = 'extracted' | 'inferred';

interface TreeSitterLanguageConfig {
    languageId: string;
    extensions: readonly string[];
    grammarModules: readonly string[];
    typeNodeKinds: readonly string[];
    functionNodeKinds: readonly string[];
    namespaceNodeKinds?: readonly string[];
}

interface TreeSitterNode {
    type: string;
    text?: string;
    startIndex: number;
    endIndex: number;
    startPosition: { row: number };
    endPosition: { row: number };
    namedChildren?: readonly TreeSitterNode[];
    childForFieldName?(name: string): TreeSitterNode | null;
}

interface TreeSitterTree {
    rootNode: TreeSitterNode;
}

interface TreeSitterParser {
    setLanguage(language: unknown): void;
    parse(content: string): TreeSitterTree;
}

const CONFIGS: TreeSitterLanguageConfig[] = [
    {
        languageId: 'ruby',
        extensions: ['.rb'],
        grammarModules: ['tree-sitter-ruby'],
        typeNodeKinds: ['class', 'module'],
        functionNodeKinds: ['method']
    },
    {
        languageId: 'php',
        extensions: ['.php'],
        grammarModules: ['tree-sitter-php', 'tree-sitter-php/php'],
        typeNodeKinds: ['class_declaration', 'interface_declaration', 'trait_declaration', 'enum_declaration'],
        functionNodeKinds: ['function_definition', 'method_declaration'],
        namespaceNodeKinds: ['namespace_definition']
    },
    {
        languageId: 'kotlin',
        extensions: ['.kt', '.kts'],
        grammarModules: ['tree-sitter-kotlin'],
        typeNodeKinds: ['class_declaration', 'object_declaration'],
        functionNodeKinds: ['function_declaration']
    }
];

export class TreeSitterStructuralAnalyzer implements MemoryLanguageAnalyzer {

    readonly id = 'tree-sitter-structural';
    readonly languageId = 'multi';
    readonly priority = 1;

    canAnalyze(file: { extension?: string; languageId?: string }): boolean {
        return !!this.configFor(file);
    }

    analyze(context: LanguageAnalysisContext): LanguageAnalysisResult {
        const config = this.configFor(context.file);
        if (!config) {
            return this.emptyResult(context, 'unknown');
        }
        const parsed = this.parseWithTreeSitter(context.content, config);
        return parsed
            ? this.resultFromTree(context, config, parsed)
            : this.resultFromHeuristics(context, config);
    }

    protected parseWithTreeSitter(content: string, config: TreeSitterLanguageConfig): TreeSitterTree | undefined {
        const ParserCtor = this.optionalRequire('tree-sitter') as { new(): TreeSitterParser } | undefined;
        const language = config.grammarModules.map(moduleName => this.optionalRequire(moduleName)).find(Boolean);
        if (!ParserCtor || !language) {
            return undefined;
        }
        try {
            const parser = new ParserCtor();
            parser.setLanguage((language as { default?: unknown }).default ?? language);
            return parser.parse(content);
        } catch {
            return undefined;
        }
    }

    protected resultFromTree(context: LanguageAnalysisContext, config: TreeSitterLanguageConfig, tree: TreeSitterTree): LanguageAnalysisResult {
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const stack: MemorySymbol[] = [];
        this.visitTree(context, config, tree.rootNode, symbols, relations, stack);
        return {
            fileId: context.file.id,
            languageId: config.languageId,
            analyzerId: this.id,
            symbols,
            relations
        };
    }

    protected visitTree(
        context: LanguageAnalysisContext,
        config: TreeSitterLanguageConfig,
        node: TreeSitterNode,
        symbols: MemorySymbol[],
        relations: MemoryRelation[],
        stack: MemorySymbol[]
    ): void {
        const kind = this.symbolKindForNode(config, node);
        const parent = stack[stack.length - 1];
        const name = kind ? this.nameForNode(node) : undefined;
        const symbol = kind && name ? this.symbol(context, config.languageId, kind, name, node, parent, 'extracted') : undefined;
        if (symbol) {
            symbols.push(symbol);
            if (parent) {
                relations.push(this.contains(context, parent.id, symbol.id, 'extracted', `tree-sitter ${node.type} contains ${name}`));
            }
            stack.push(symbol);
        }
        for (const child of node.namedChildren ?? []) {
            this.visitTree(context, config, child, symbols, relations, stack);
        }
        if (symbol) {
            stack.pop();
        }
    }

    protected resultFromHeuristics(context: LanguageAnalysisContext, config: TreeSitterLanguageConfig): LanguageAnalysisResult {
        const symbols: MemorySymbol[] = [];
        const relations: MemoryRelation[] = [];
        const patterns = [
            { kind: 'namespace' as const, pattern: /^\s*(?:module|namespace|package)\s+([A-Za-z_][A-Za-z0-9_:.\\]*)/gm },
            { kind: 'class' as const, pattern: /^\s*(?:export\s+)?(?:abstract\s+)?(?:class|trait|object)\s+([A-Za-z_][A-Za-z0-9_]*)/gm },
            { kind: 'interface' as const, pattern: /^\s*(?:export\s+)?interface\s+([A-Za-z_][A-Za-z0-9_]*)/gm },
            { kind: 'enum' as const, pattern: /^\s*(?:export\s+)?enum\s+([A-Za-z_][A-Za-z0-9_]*)/gm },
            { kind: 'method' as const, pattern: /^\s*(?:public|private|protected|static|suspend|fun|def|function|\s)+([A-Za-z_][A-Za-z0-9_!?]*)\s*\(/gm }
        ];
        for (const { kind, pattern } of patterns) {
            for (const match of context.content.matchAll(pattern)) {
                const offset = match.index ?? 0;
                const parent = symbols
                    .filter(symbol => symbol.symbolKind !== 'method' && (symbol.startLine ?? 0) <= this.lineOf(context.content, offset))
                    .slice(-1)[0];
                const symbol = this.symbolFromOffset(context, config.languageId, kind, match[1], offset, parent, 'inferred');
                symbols.push(symbol);
                if (parent && kind === 'method') {
                    relations.push(this.contains(context, parent.id, symbol.id, 'inferred', `heuristic ${parent.name} contains ${symbol.name}`));
                }
            }
        }
        return {
            fileId: context.file.id,
            languageId: config.languageId,
            analyzerId: this.id,
            symbols,
            relations,
            diagnostics: [{
                id: context.createRelationId(`tree-sitter-unavailable:${context.file.id}`),
                severity: 'info',
                message: `Tree-sitter grammar for ${config.languageId} is unavailable; structural symbols were inferred with local heuristics.`,
                path: context.file.relativePath
            }]
        };
    }

    protected symbolKindForNode(config: TreeSitterLanguageConfig, node: TreeSitterNode): MemorySymbol['symbolKind'] | undefined {
        if (config.namespaceNodeKinds?.includes(node.type)) {
            return 'namespace';
        }
        if (config.typeNodeKinds.includes(node.type)) {
            return node.type.includes('interface') ? 'interface' : node.type.includes('enum') ? 'enum' : 'class';
        }
        if (config.functionNodeKinds.includes(node.type)) {
            return 'method';
        }
        return undefined;
    }

    protected nameForNode(node: TreeSitterNode): string | undefined {
        const fieldName = node.childForFieldName?.('name')?.text;
        if (fieldName) {
            return fieldName;
        }
        return node.text?.match(/\b(?:class|module|namespace|interface|trait|enum|object|fun|def|function)\s+([A-Za-z_][A-Za-z0-9_!?]*)/)?.[1];
    }

    protected symbol(
        context: LanguageAnalysisContext,
        languageId: string,
        kind: MemorySymbol['symbolKind'],
        name: string,
        node: TreeSitterNode,
        parent: MemorySymbol | undefined,
        confidenceLevel: TreeSitterConfidence
    ): MemorySymbol {
        return {
            id: context.createSymbolId(`${this.id}:${kind}:${name}:${node.startIndex}`),
            fileId: context.file.id,
            languageId,
            symbolKind: kind,
            name,
            fullName: parent ? `${parent.fullName ?? parent.name}.${name}` : name,
            parentSymbolId: parent?.id,
            signature: node.text?.split(/\r?\n/)[0]?.trim(),
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            metadata: {
                analyzer: this.id,
                confidenceLevel,
                extractionSource: confidenceLevel === 'extracted' ? 'tree-sitter' : 'heuristic'
            }
        };
    }

    protected symbolFromOffset(
        context: LanguageAnalysisContext,
        languageId: string,
        kind: MemorySymbol['symbolKind'],
        name: string,
        offset: number,
        parent: MemorySymbol | undefined,
        confidenceLevel: TreeSitterConfidence
    ): MemorySymbol {
        return {
            id: context.createSymbolId(`${this.id}:${kind}:${name}:${offset}`),
            fileId: context.file.id,
            languageId,
            symbolKind: kind,
            name,
            fullName: parent ? `${parent.fullName ?? parent.name}.${name}` : name,
            parentSymbolId: parent?.id,
            signature: context.content.slice(offset, context.content.indexOf('\n', offset) >= 0 ? context.content.indexOf('\n', offset) : context.content.length).trim(),
            startLine: this.lineOf(context.content, offset),
            metadata: {
                analyzer: this.id,
                confidenceLevel,
                extractionSource: confidenceLevel === 'extracted' ? 'tree-sitter' : 'heuristic'
            }
        };
    }

    protected contains(context: LanguageAnalysisContext, sourceId: string, targetId: string, confidenceLevel: TreeSitterConfidence, evidence: string): MemoryRelation {
        return {
            id: context.createRelationId(`${this.id}:contains:${sourceId}:${targetId}`),
            sourceKind: 'symbol',
            sourceId,
            targetKind: 'symbol',
            targetId,
            relationType: 'contains',
            confidenceLevel,
            confidenceScore: confidenceLevel === 'extracted' ? 0.9 : 0.62,
            evidence,
            metadata: {
                analyzer: this.id,
                extractionSource: confidenceLevel === 'extracted' ? 'tree-sitter' : 'heuristic'
            }
        };
    }

    protected configFor(file: { extension?: string; languageId?: string }): TreeSitterLanguageConfig | undefined {
        return CONFIGS.find(config => file.languageId === config.languageId || config.extensions.includes(file.extension ?? ''));
    }

    protected optionalRequire(moduleName: string): unknown | undefined {
        try {
            return require(moduleName);
        } catch {
            return undefined;
        }
    }

    protected emptyResult(context: LanguageAnalysisContext, languageId: string): LanguageAnalysisResult {
        return {
            fileId: context.file.id,
            languageId,
            analyzerId: this.id,
            symbols: [],
            relations: []
        };
    }

    protected lineOf(content: string, offset: number): number {
        return content.slice(0, offset).split('\n').length;
    }
}

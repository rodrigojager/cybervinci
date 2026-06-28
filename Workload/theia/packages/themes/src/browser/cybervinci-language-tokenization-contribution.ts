import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import * as monaco from '@theia/monaco-editor-core';

@injectable()
export class CyberVinciLanguageTokenizationContribution implements FrontendApplicationContribution {

    onStart(): void {
        this.registerLanguage({
            id: 'python',
            extensions: ['.py', '.pyw', '.ipy'],
            aliases: ['Python', 'python']
        });
        this.registerLanguage({
            id: 'html',
            extensions: ['.html', '.htm'],
            aliases: ['HTML', 'html']
        });
        this.registerLanguage({
            id: 'csharp',
            extensions: ['.cs', '.csx'],
            aliases: ['C#', 'csharp']
        });

        monaco.languages.setMonarchTokensProvider('python', PYTHON_MONARCH);
        monaco.languages.setMonarchTokensProvider('html', HTML_MONARCH);
        monaco.languages.setMonarchTokensProvider('csharp', CSHARP_MONARCH);

        for (const model of monaco.editor.getModels()) {
            this.applyLanguageFallback(model);
        }
        monaco.editor.onDidCreateModel(model => this.applyLanguageFallback(model));
    }

    protected registerLanguage(language: monaco.languages.ILanguageExtensionPoint): void {
        if (!monaco.languages.getLanguages().some(existing => existing.id === language.id)) {
            monaco.languages.register(language);
        }
    }

    protected applyLanguageFallback(model: monaco.editor.ITextModel): void {
        if (model.getLanguageId() !== 'plaintext') {
            return;
        }
        const modelPath = model.uri.path.toLowerCase();
        const fallback = LANGUAGE_FALLBACKS.find(candidate => candidate.extensions.some(extension => modelPath.endsWith(extension)));
        if (fallback) {
            monaco.editor.setModelLanguage(model, fallback.languageId);
        }
    }
}

const LANGUAGE_FALLBACKS = [
    { languageId: 'python', extensions: ['.py', '.pyw', '.ipy'] },
    { languageId: 'html', extensions: ['.html', '.htm'] },
    { languageId: 'csharp', extensions: ['.cs', '.csx'] }
];

const PYTHON_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.python',
    keywords: [
        'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del', 'elif', 'else',
        'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match', 'None',
        'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'
    ],
    builtins: [
        'abs', 'all', 'any', 'bool', 'bytes', 'callable', 'chr', 'dict', 'dir', 'enumerate', 'filter', 'float', 'format',
        'getattr', 'hasattr', 'int', 'isinstance', 'issubclass', 'len', 'list', 'map', 'max', 'min', 'next', 'object',
        'open', 'print', 'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'sorted', 'str', 'sum',
        'super', 'tuple', 'type', 'zip'
    ],
    operators: ['+', '-', '*', '**', '/', '//', '%', '=', '==', '!=', '<', '<=', '>', '>=', '+=', '-=', '*=', '/=', '%=', ':='],
    brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],
    tokenizer: {
        root: [
            [/[a-zA-Z_]\w*/, {
                cases: {
                    '@keywords': 'keyword',
                    '@builtins': 'support.function',
                    '@default': 'identifier'
                }
            }],
            [/#.*$/, 'comment'],
            [/'''/, 'string', '@tripleSingleString'],
            [/"""/, 'string', '@tripleDoubleString'],
            [/'/, 'string', '@singleString'],
            [/"/, 'string', '@doubleString'],
            [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F_]+/, 'number.hex'],
            [/\d+/, 'number'],
            [/[{}()[\]]/, '@brackets'],
            [/[+\-*/%=<>!&|^~:.,;]+/, 'operator']
        ],
        singleString: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop']
        ],
        doubleString: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
        ],
        tripleSingleString: [
            [/'''/, 'string', '@pop'],
            [/\\./, 'string.escape'],
            [/./, 'string']
        ],
        tripleDoubleString: [
            [/"""/, 'string', '@pop'],
            [/\\./, 'string.escape'],
            [/./, 'string']
        ]
    }
};

const HTML_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.html',
    tokenizer: {
        root: [
            [/<!DOCTYPE[^>]*>/i, 'metatag'],
            [/<!--/, 'comment', '@comment'],
            [/<\/?/, 'delimiter.angle', '@tagName'],
            [/[^<]+/, '']
        ],
        comment: [
            [/[^-]+/, 'comment'],
            [/-->/, 'comment', '@pop'],
            [/./, 'comment']
        ],
        tagName: [
            [/[a-zA-Z][\w:-]*/, { token: 'tag', next: '@tag' }],
            [/\/?>/, 'delimiter.angle', '@pop'],
            [/\s+/, '']
        ],
        tag: [
            [/[a-zA-Z_:][\w:.-]*/, 'attribute.name'],
            [/=\s*"/, 'delimiter', '@attributeDoubleString'],
            [/=\s*'/, 'delimiter', '@attributeSingleString'],
            [/=/, 'delimiter'],
            [/\/?>/, 'delimiter.angle', '@pop'],
            [/\s+/, '']
        ],
        attributeDoubleString: [
            [/[^"]+/, 'string'],
            [/"/, 'string', '@pop']
        ],
        attributeSingleString: [
            [/[^']+/, 'string'],
            [/'/, 'string', '@pop']
        ]
    }
};

const CSHARP_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.csharp',
    keywords: [
        'abstract', 'as', 'base', 'break', 'case', 'catch', 'checked', 'class', 'const', 'continue', 'default',
        'delegate', 'do', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'for', 'foreach',
        'goto', 'if', 'implicit', 'in', 'interface', 'internal', 'is', 'lock', 'namespace', 'new', 'null', 'operator',
        'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sealed', 'sizeof',
        'stackalloc', 'static', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'unchecked', 'unsafe',
        'using', 'virtual', 'void', 'volatile', 'while', 'async', 'await', 'var', 'when', 'where', 'yield'
    ],
    typeKeywords: [
        'bool', 'byte', 'char', 'decimal', 'double', 'dynamic', 'float', 'int', 'long', 'object', 'sbyte', 'short',
        'string', 'uint', 'ulong', 'ushort'
    ],
    operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '&',
        '|', '^', '%', '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '=>', '??', '?.'
    ],
    brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],
    tokenizer: {
        root: [
            [/[a-zA-Z_]\w*/, {
                cases: {
                    '@keywords': 'keyword',
                    '@typeKeywords': 'type.identifier',
                    '@default': 'identifier'
                }
            }],
            [/[A-Z]\w*/, 'type.identifier'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
            [/@"/, 'string', '@verbatimString'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)'/, 'string'],
            [/\d*\.\d+([eE][-+]?\d+)?[fFdDmM]?/, 'number.float'],
            [/0[xX][0-9a-fA-F_]+/, 'number.hex'],
            [/\d+[lLfFdDmMuU]?/, 'number'],
            [/[{}()[\]]/, '@brackets'],
            [/[=+\-*/%<>!&|^~?:]+/, 'operator'],
            [/[;,.]/, 'delimiter']
        ],
        comment: [
            [/[^/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[/*]/, 'comment']
        ],
        string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
        ],
        verbatimString: [
            [/[^"]+/, 'string'],
            [/""/, 'string.escape'],
            [/"/, 'string', '@pop']
        ]
    }
};

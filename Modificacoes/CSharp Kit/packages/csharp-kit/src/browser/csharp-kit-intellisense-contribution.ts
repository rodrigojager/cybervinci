import { FileUri } from '@theia/core/lib/common/file-uri';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { CommandRegistry, CommandService } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { SymbolInformation, SymbolKind as LspSymbolKind, WorkspaceSymbolParams } from '@theia/core/shared/vscode-languageserver-protocol';
import { inject, injectable, preDestroy } from '@theia/core/shared/inversify';
import * as monaco from '@theia/monaco-editor-core';
import { MonacoBulkEditService } from '@theia/monaco/lib/browser/monaco-bulk-edit-service';
import { MonacoLanguages } from '@theia/monaco/lib/browser/monaco-languages';
import { LanguageSelector } from '@theia/monaco-editor-core/esm/vs/editor/common/languageSelector';
import { URI } from '@theia/monaco-editor-core/esm/vs/base/common/uri';
import { EvaluatableExpression, EvaluatableExpressionProvider, InlineValue, InlineValueContext, InlineValuesProvider, MultiDocumentHighlightProvider, WorkspaceEdit as MonacoWorkspaceEdit } from '@theia/monaco-editor-core/esm/vs/editor/common/languages';
import { ILanguageFeaturesService } from '@theia/monaco-editor-core/esm/vs/editor/common/services/languageFeatures';
import { StandaloneServices } from '@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CSharpKitDiagnosticsContribution } from './csharp-kit-diagnostics-contribution';
import {
    CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS,
    CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES,
    CSharpIntelliSenseItem,
    CSharpIntelliSenseItemKind,
    CSharpIntelliSenseResult,
    CSharpKitService,
    CSharpLanguageServerCodeAction,
    CSharpLanguageServerCodeLens,
    CSharpLanguageServerCompletionContext,
    CSharpLanguageServerDiagnostic,
    CSharpLanguageServerDocumentLink,
    CSharpLanguageServerDocumentSymbol,
    CSharpLanguageServerEvaluatableExpression,
    CSharpLanguageServerInlayHint,
    CSharpLanguageServerInlineCompletion,
    CSharpLanguageServerInlineCompletionContext,
    CSharpLanguageServerInlineValue,
    CSharpLanguageServerAdapterLanguage,
    CSharpLanguageServerNewSymbolName,
    CSharpLanguageServerSignatureHelpContext,
    CSharpLanguageServerSignatureHelpTriggerKind,
    CSharpLanguageServerWorkspaceSymbol,
    CSharpWorkspaceSymbol,
    CSharpWorkspaceSymbolKind,
    CSharpWorkspaceSymbolRange,
    CSharpWorkspaceSymbolResult
} from '../common';

const CSHARP_LANGUAGE_ID = 'csharp';
const RAZOR_LANGUAGE_ID = 'razor';
const CSHARP_PROJECT_LANGUAGE_ID = 'csharp-project';
const CSHARP_SOLUTION_LANGUAGE_ID = 'csharp-solution';
const CSHARP_CACHE_TTL_MS = 30000;
const CSHARP_CODE_ACTION_KINDS = ['quickfix', 'refactor', 'source', 'source.organizeImports'];
const CSHARP_WORKSPACE_SYMBOL_LIMIT = 250;
const CSHARP_LSP_EXECUTE_COMMAND_ID = 'cybervinci.csharpKit.languageServer.executeCommand';
const CSHARP_LSP_DIAGNOSTICS_DEBOUNCE_MS = 1200;

const CSHARP_LANGUAGE_FALLBACKS = [
    { languageId: CSHARP_LANGUAGE_ID, extensions: ['.cs', '.csx'] },
    { languageId: RAZOR_LANGUAGE_ID, extensions: ['.razor', '.cshtml'] },
    { languageId: CSHARP_PROJECT_LANGUAGE_ID, extensions: ['.csproj', '.csproject'] },
    { languageId: CSHARP_SOLUTION_LANGUAGE_ID, extensions: ['.sln', '.slnx', '.slnf'] }
];

interface CSharpLanguageServerCommandPayload {
    command: string;
    arguments?: unknown[];
    documentUri?: string;
}

type CSharpKitWorkspaceSymbolInformation = SymbolInformation & {
    __csharpKitWorkspaceSymbolId?: string;
};

@injectable()
export class CSharpKitIntelliSenseContribution implements FrontendApplicationContribution {

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MonacoLanguages)
    protected readonly monacoLanguages: MonacoLanguages;

    @inject(MonacoBulkEditService)
    protected readonly bulkEditService: MonacoBulkEditService;

    @inject(CSharpKitDiagnosticsContribution)
    protected readonly diagnostics: CSharpKitDiagnosticsContribution;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    protected readonly toDispose = new DisposableCollection();
    protected cache: { workspacePath: string; loadedAt: number; promise: Promise<CSharpIntelliSenseResult> } | undefined;
    protected symbolCache: { workspacePath: string; loadedAt: number; promise: Promise<CSharpWorkspaceSymbolResult> } | undefined;
    protected readonly completionItemCache = new Map<string, { item: CSharpIntelliSenseItem; documentUri: string }>();
    protected completionItemId = 0;
    protected readonly codeActionCache = new Map<string, { action: CSharpLanguageServerCodeAction; documentUri: string }>();
    protected codeActionId = 0;
    protected readonly codeLensCache = new Map<string, CSharpLanguageServerCodeLens>();
    protected codeLensId = 0;
    protected readonly documentLinkCache = new Map<string, { link: CSharpLanguageServerDocumentLink; documentUri: string }>();
    protected documentLinkId = 0;
    protected readonly inlayHintCache = new Map<string, { hint: CSharpLanguageServerInlayHint; documentUri: string }>();
    protected inlayHintId = 0;
    protected readonly workspaceSymbolCache = new Map<string, { symbol: CSharpLanguageServerWorkspaceSymbol; workspacePath: string; language: CSharpLanguageServerAdapterLanguage }>();
    protected workspaceSymbolId = 0;
    protected readonly languageServerDiagnosticTimers = new Map<string, ReturnType<typeof setTimeout>>();

    onStart(_app: FrontendApplication): void {
        this.registerLanguage();
        this.registerLanguageServerDiagnostics();
        this.toDispose.push(this.commandRegistry.registerCommand({
            id: CSHARP_LSP_EXECUTE_COMMAND_ID,
            label: 'C# Kit: Execute Language Server Command'
        }, {
            execute: payload => this.executeLanguageServerCommand(payload)
        }));
        this.toDispose.push(this.monacoLanguages.registerWorkspaceSymbolProvider({
            provideWorkspaceSymbols: (params, token) => this.provideWorkspaceSymbols(params, token),
            resolveWorkspaceSymbol: (symbol, token) => this.resolveWorkspaceSymbol(symbol, token)
        }));
        const languageFeatures = StandaloneServices.get(ILanguageFeaturesService);
        for (const selector of [
            CSHARP_LANGUAGE_ID,
            { language: RAZOR_LANGUAGE_ID, scheme: 'file' },
            { pattern: '**/*.cshtml', scheme: 'file' },
            { pattern: '**/*.razor', scheme: 'file' }
        ]) {
            this.toDispose.push(monaco.languages.registerCompletionItemProvider(selector, {
                triggerCharacters: ['.', '[', '<', ' ', ':'],
                provideCompletionItems: (model, position, context) => this.provideCompletionItems(model, position, context),
                resolveCompletionItem: (item, token) => this.resolveCompletionItem(item, token)
            }));
            this.toDispose.push(monaco.languages.registerHoverProvider(selector, {
                provideHover: (model, position) => this.provideHover(model, position)
            }));
            this.toDispose.push(monaco.languages.registerDocumentHighlightProvider(selector, {
                provideDocumentHighlights: (model, position) => this.provideDocumentHighlights(model, position)
            }));
            this.toDispose.push(languageFeatures.multiDocumentHighlightProvider.register(selector as LanguageSelector, this.createMultiDocumentHighlightProvider(selector as LanguageSelector)));
            this.toDispose.push(monaco.languages.registerLinkProvider(selector, {
                provideLinks: model => this.provideLinks(model),
                resolveLink: (link, token) => this.resolveLink(link, token)
            }));
            this.toDispose.push(monaco.languages.registerColorProvider(selector, {
                provideDocumentColors: model => this.provideDocumentColors(model),
                provideColorPresentations: (model, colorInfo) => this.provideColorPresentations(model, colorInfo)
            }));
            this.toDispose.push(monaco.languages.registerCodeLensProvider(selector, {
                provideCodeLenses: (model, token) => this.provideCodeLenses(model, token),
                resolveCodeLens: (model, codeLens, token) => this.resolveCodeLens(model, codeLens, token)
            }));
            this.toDispose.push(monaco.languages.registerDocumentSemanticTokensProvider(selector, {
                getLegend: () => this.semanticTokensLegend(),
                provideDocumentSemanticTokens: (model, lastResultId) => this.provideDocumentSemanticTokens(model, lastResultId),
                releaseDocumentSemanticTokens: () => undefined
            }));
            this.toDispose.push(monaco.languages.registerDocumentRangeSemanticTokensProvider(selector, {
                getLegend: () => this.semanticTokensLegend(),
                provideDocumentRangeSemanticTokens: (model, range) => this.provideDocumentRangeSemanticTokens(model, range)
            }));
            this.toDispose.push(monaco.languages.registerLinkedEditingRangeProvider(selector, {
                provideLinkedEditingRanges: (model, position) => this.provideLinkedEditingRanges(model, position)
            }));
            this.toDispose.push(monaco.languages.registerSelectionRangeProvider(selector, {
                provideSelectionRanges: (model, positions) => this.provideSelectionRanges(model, positions)
            }));
            this.toDispose.push(monaco.languages.registerDefinitionProvider(selector, {
                provideDefinition: (model, position) => this.provideDefinition(model, position)
            }));
            this.toDispose.push(monaco.languages.registerDeclarationProvider(selector, {
                provideDeclaration: (model, position) => this.provideDeclaration(model, position)
            }));
            this.toDispose.push(monaco.languages.registerImplementationProvider(selector, {
                provideImplementation: (model, position) => this.provideImplementation(model, position)
            }));
            this.toDispose.push(monaco.languages.registerTypeDefinitionProvider(selector, {
                provideTypeDefinition: (model, position) => this.provideTypeDefinition(model, position)
            }));
            this.toDispose.push(monaco.languages.registerReferenceProvider(selector, {
                provideReferences: (model, position, context) => this.provideReferences(model, position, context)
            }));
            this.toDispose.push(monaco.languages.registerRenameProvider(selector, {
                resolveRenameLocation: (model, position) => this.resolveRenameLocation(model, position),
                provideRenameEdits: (model, position, newName) => this.provideRenameEdits(model, position, newName)
            }));
            this.toDispose.push(monaco.languages.registerNewSymbolNameProvider(selector, {
                supportsAutomaticNewSymbolNamesTriggerKind: Promise.resolve(true),
                provideNewSymbolNames: (model, range, triggerKind, token) => this.provideNewSymbolNames(model, range, triggerKind, token)
            }));
            this.toDispose.push(monaco.languages.registerCodeActionProvider(selector, {
                provideCodeActions: (model, range, context) => this.provideCodeActions(model, range, context),
                resolveCodeAction: (codeAction, token) => this.resolveCodeAction(codeAction, token)
            }, {
                providedCodeActionKinds: CSHARP_CODE_ACTION_KINDS
            }));
            this.toDispose.push(monaco.languages.registerDocumentFormattingEditProvider(selector, {
                provideDocumentFormattingEdits: (model, options) => this.provideDocumentFormattingEdits(model, options)
            }));
            this.toDispose.push(monaco.languages.registerDocumentRangeFormattingEditProvider(selector, {
                provideDocumentRangeFormattingEdits: (model, range, options) => this.provideDocumentRangeFormattingEdits(model, range, options),
                provideDocumentRangesFormattingEdits: (model, ranges, options) => this.provideDocumentRangesFormattingEdits(model, ranges, options)
            }));
            this.toDispose.push(monaco.languages.registerOnTypeFormattingEditProvider(selector, {
                autoFormatTriggerCharacters: [';', '}', '\n'],
                provideOnTypeFormattingEdits: (model, position, ch, options) => this.provideOnTypeFormattingEdits(model, position, ch, options)
            }));
            this.toDispose.push(monaco.languages.registerInlayHintsProvider(selector, {
                provideInlayHints: (model, range) => this.provideInlayHints(model, range),
                resolveInlayHint: (hint, token) => this.resolveInlayHint(hint, token)
            }));
            this.toDispose.push(monaco.languages.registerInlineCompletionsProvider(selector, {
                groupId: 'csharp-kit-lsp',
                displayName: 'C# Kit Language Server',
                provideInlineCompletions: (model, position, context, token) => this.provideInlineCompletions(model, position, context, token),
                disposeInlineCompletions: () => undefined
            }));
            this.toDispose.push(languageFeatures.evaluatableExpressionProvider.register(selector as LanguageSelector, this.createEvaluatableExpressionProvider()));
            this.toDispose.push(languageFeatures.inlineValuesProvider.register(selector as LanguageSelector, this.createInlineValuesProvider()));
            this.toDispose.push(monaco.languages.registerSignatureHelpProvider(selector, {
                signatureHelpTriggerCharacters: ['(', ','],
                signatureHelpRetriggerCharacters: [','],
                provideSignatureHelp: (model, position, _token, context) => this.provideSignatureHelp(model, position, context)
            }));
            this.toDispose.push(monaco.languages.registerDocumentSymbolProvider(selector, {
                provideDocumentSymbols: model => this.provideDocumentSymbols(model)
            }));
            this.toDispose.push(monaco.languages.registerFoldingRangeProvider(selector, {
                provideFoldingRanges: (model, context) => this.provideFoldingRanges(model, context)
            }));
        }
    }

    @preDestroy()
    protected dispose(): void {
        this.clearLanguageServerDiagnosticTimers();
        this.toDispose.dispose();
    }

    protected registerLanguageServerDiagnostics(): void {
        this.toDispose.push(monaco.editor.onDidCreateModel(model => this.watchLanguageServerDiagnostics(model)));
        for (const model of monaco.editor.getModels()) {
            this.watchLanguageServerDiagnostics(model);
        }
    }

    protected watchLanguageServerDiagnostics(model: monaco.editor.ITextModel): void {
        if (!this.isCSharpLikeModel(model) || model.uri.scheme !== 'file') {
            return;
        }
        this.toDispose.push(model.onDidChangeContent(() => this.scheduleLanguageServerDiagnostics(model)));
        this.toDispose.push(model.onWillDispose(() => {
            this.clearLanguageServerDiagnosticTimer(model.uri.toString());
            this.diagnostics.clearLanguageServerDocumentDiagnostics(model.uri.toString());
        }));
        this.scheduleLanguageServerDiagnostics(model, 200);
    }

    protected scheduleLanguageServerDiagnostics(model: monaco.editor.ITextModel, delayMs = CSHARP_LSP_DIAGNOSTICS_DEBOUNCE_MS): void {
        if (!this.isCSharpLikeModel(model) || model.uri.scheme !== 'file') {
            return;
        }
        const key = model.uri.toString();
        this.clearLanguageServerDiagnosticTimer(key);
        const timer = setTimeout(() => {
            this.languageServerDiagnosticTimers.delete(key);
            this.refreshLanguageServerDiagnostics(model).catch(() => undefined);
        }, delayMs);
        this.languageServerDiagnosticTimers.set(key, timer);
    }

    protected clearLanguageServerDiagnosticTimer(documentUri: string): void {
        const timer = this.languageServerDiagnosticTimers.get(documentUri);
        if (timer) {
            clearTimeout(timer);
            this.languageServerDiagnosticTimers.delete(documentUri);
        }
    }

    protected clearLanguageServerDiagnosticTimers(): void {
        for (const timer of this.languageServerDiagnosticTimers.values()) {
            clearTimeout(timer);
        }
        this.languageServerDiagnosticTimers.clear();
    }

    protected async refreshLanguageServerDiagnostics(model: monaco.editor.ITextModel): Promise<void> {
        if (!this.isCSharpLikeModel(model) || model.uri.scheme !== 'file') {
            return;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return;
        }
        const documentUri = model.uri.toString();
        const versionId = model.getVersionId();
        const result = await this.service.getLanguageServerDiagnostics({
            workspacePath,
            documentPath: FileUri.fsPath(documentUri),
            content: model.getValue(),
            language: this.languageServerLanguage(model)
        });
        if (model.getVersionId() !== versionId) {
            return;
        }
        if (result.source === 'language-server') {
            this.diagnostics.publishLanguageServerDocumentDiagnostics(documentUri, result.diagnostics);
        } else {
            this.diagnostics.clearLanguageServerDocumentDiagnostics(documentUri);
        }
    }

    protected registerLanguage(): void {
        this.registerMonacoLanguage({
            id: CSHARP_LANGUAGE_ID,
            extensions: ['.cs', '.csx'],
            aliases: ['C#', 'csharp', 'cs'],
            mimetypes: ['text/x-csharp']
        });
        const registeredRazor = this.registerMonacoLanguage({
            id: RAZOR_LANGUAGE_ID,
            extensions: ['.razor', '.cshtml'],
            aliases: ['Razor', 'razor', 'cshtml'],
            mimetypes: ['text/x-razor', 'text/x-cshtml']
        });
        const registeredProject = this.registerMonacoLanguage({
            id: CSHARP_PROJECT_LANGUAGE_ID,
            extensions: ['.csproj', '.csproject'],
            aliases: ['C# Project', 'MSBuild C# Project', 'csproj'],
            mimetypes: ['application/xml']
        });
        const registeredSolution = this.registerMonacoLanguage({
            id: CSHARP_SOLUTION_LANGUAGE_ID,
            extensions: ['.sln', '.slnx', '.slnf'],
            aliases: ['C# Solution', '.NET Solution', 'sln']
        });

        this.toDispose.push(monaco.languages.setLanguageConfiguration(CSHARP_LANGUAGE_ID, {
            comments: {
                lineComment: '//',
                blockComment: ['/*', '*/']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
                ['<', '>']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"', notIn: ['string'] },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ]
        }));
        this.toDispose.push(monaco.languages.setLanguageConfiguration(RAZOR_LANGUAGE_ID, {
            comments: {
                blockComment: ['<!--', '-->']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
                ['<', '>']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ]
        }));
        this.toDispose.push(monaco.languages.setLanguageConfiguration(CSHARP_PROJECT_LANGUAGE_ID, {
            comments: {
                blockComment: ['<!--', '-->']
            },
            brackets: [
                ['<', '>']
            ],
            autoClosingPairs: [
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ],
            surroundingPairs: [
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ]
        }));
        this.toDispose.push(monaco.languages.setLanguageConfiguration(CSHARP_SOLUTION_LANGUAGE_ID, {
            comments: {
                lineComment: '#',
                blockComment: ['<!--', '-->']
            },
            brackets: [
                ['{', '}'],
                ['(', ')'],
                ['<', '>']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: '\'', close: '\'' }
            ]
        }));

        if (registeredRazor) {
            this.toDispose.push(monaco.languages.setMonarchTokensProvider(RAZOR_LANGUAGE_ID, RAZOR_MONARCH));
        }
        if (registeredProject) {
            this.toDispose.push(monaco.languages.setMonarchTokensProvider(CSHARP_PROJECT_LANGUAGE_ID, CSHARP_PROJECT_MONARCH));
        }
        if (registeredSolution) {
            this.toDispose.push(monaco.languages.setMonarchTokensProvider(CSHARP_SOLUTION_LANGUAGE_ID, CSHARP_SOLUTION_MONARCH));
        }

        this.applyLanguageFallbacks();
    }

    protected registerMonacoLanguage(language: monaco.languages.ILanguageExtensionPoint): boolean {
        if (monaco.languages.getLanguages().some(existing => existing.id === language.id)) {
            return false;
        }
        monaco.languages.register(language);
        return true;
    }

    protected applyLanguageFallbacks(): void {
        for (const model of monaco.editor.getModels()) {
            this.applyLanguageFallback(model);
        }
        this.toDispose.push(monaco.editor.onDidCreateModel(model => this.applyLanguageFallback(model)));
    }

    protected applyLanguageFallback(model: monaco.editor.ITextModel): void {
        if (model.getLanguageId() !== 'plaintext') {
            return;
        }
        const modelPath = model.uri.path.toLowerCase();
        const fallback = CSHARP_LANGUAGE_FALLBACKS.find(candidate => candidate.extensions.some(extension => modelPath.endsWith(extension)));
        if (fallback) {
            monaco.editor.setModelLanguage(model, fallback.languageId);
        }
    }

    protected createInlineValuesProvider(): InlineValuesProvider {
        return {
            provideInlineValues: (model, range, context, token) => token.isCancellationRequested
                ? undefined
                : this.provideInlineValues(model as unknown as monaco.editor.ITextModel, range as monaco.Range, context)
        };
    }

    protected createMultiDocumentHighlightProvider(selector: LanguageSelector): MultiDocumentHighlightProvider {
        return {
            selector,
            provideMultiDocumentHighlights: (primaryModel, position, otherModels, token) => token.isCancellationRequested
                ? undefined
                : this.provideMultiDocumentHighlights(
                    primaryModel as unknown as monaco.editor.ITextModel,
                    position as monaco.Position,
                    otherModels as unknown as monaco.editor.ITextModel[],
                    token
                )
        };
    }

    protected createEvaluatableExpressionProvider(): EvaluatableExpressionProvider {
        return {
            provideEvaluatableExpression: (model, position, token) => token.isCancellationRequested
                ? undefined
                : this.provideEvaluatableExpression(model as unknown as monaco.editor.ITextModel, position as monaco.Position)
        };
    }

    protected async provideInlineValues(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        context: InlineValueContext
    ): Promise<InlineValue[] | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerInlineValues(model, range, context, workspacePath);
    }

    protected async provideEvaluatableExpression(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<EvaluatableExpression | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerEvaluatableExpression(model, position, workspacePath);
    }

    protected async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context?: monaco.languages.CompletionContext
    ): Promise<monaco.languages.CompletionList> {
        if (!this.isCSharpLikeModel(model)) {
            return { suggestions: [] };
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return { suggestions: [] };
        }
        const range = this.completionRange(model, position);
        const lspCompletions = await this.getLanguageServerCompletions(model, position, workspacePath, range, context);
        if (lspCompletions?.suggestions.length) {
            return lspCompletions;
        }
        const result = await this.getCachedIntelliSense(workspacePath);
        const suggestions = result.items.map(item => this.toCompletionItem(item, range));
        return { suggestions };
    }

    protected async resolveCompletionItem(item: monaco.languages.CompletionItem, token: monaco.CancellationToken): Promise<monaco.languages.CompletionItem | undefined> {
        const id = (item as monaco.languages.CompletionItem & { __csharpKitCompletionItemId?: string }).__csharpKitCompletionItemId;
        const cached = id ? this.completionItemCache.get(id) : undefined;
        if (!cached || token.isCancellationRequested) {
            return item;
        }
        const model = monaco.editor.getModel(monaco.Uri.parse(cached.documentUri));
        const workspacePath = await this.workspacePath();
        if (!model || !workspacePath || token.isCancellationRequested) {
            return item;
        }
        const resolved = await this.resolveLanguageServerCompletionItem(model, workspacePath, cached.item);
        if (!resolved) {
            return item;
        }
        if (id) {
            this.completionItemCache.set(id, { item: resolved, documentUri: cached.documentUri });
        }
        return {
            ...item,
            label: resolved.label,
            insertText: resolved.insertText,
            kind: this.toMonacoKind(resolved.kind),
            detail: resolved.detail,
            documentation: resolved.documentation,
            sortText: resolved.sortText ?? item.sortText,
            filterText: resolved.filterText ?? item.filterText,
            preselect: resolved.preselect ?? item.preselect,
            range: resolved.textEdit ? this.symbolRange(resolved.textEdit.range) : item.range,
            commitCharacters: resolved.commitCharacters ?? item.commitCharacters,
            insertTextRules: resolved.kind === 'snippet' || resolved.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : item.insertTextRules,
            additionalTextEdits: resolved.additionalTextEdits?.length
                ? this.toMonacoTextEdits(resolved.additionalTextEdits)
                : item.additionalTextEdits,
            command: resolved.command ? this.toMonacoCommand(resolved.command, cached.documentUri) : item.command
        };
    }

    protected async executeLanguageServerCommand(payload: CSharpLanguageServerCommandPayload | undefined): Promise<unknown> {
        if (!payload?.command) {
            return undefined;
        }
        const args = payload.arguments ?? [];
        if (payload.command !== CSHARP_LSP_EXECUTE_COMMAND_ID && this.commandRegistry.isEnabled(payload.command, ...args)) {
            return this.commandService.executeCommand(payload.command, ...args);
        }
        if (!payload.documentUri) {
            return undefined;
        }
        const model = monaco.editor.getModel(monaco.Uri.parse(payload.documentUri));
        const workspacePath = await this.workspacePath();
        if (!model || !workspacePath || model.uri.scheme !== 'file') {
            return undefined;
        }
        const result = await this.service.executeLanguageServerCommand({
            workspacePath,
            documentPath: FileUri.fsPath(model.uri.toString()),
            content: model.getValue(),
            command: payload.command,
            arguments: args,
            language: this.languageServerLanguage(model)
        });
        if (result.source === 'language-server' && result.edits.length) {
            await this.applyLanguageServerWorkspaceEdits(result.edits);
        }
        return result.result;
    }

    protected async applyLanguageServerWorkspaceEdits(edits: Array<{ uri: string; range: CSharpWorkspaceSymbolRange; newText: string }>): Promise<void> {
        const workspaceEdit = this.toMonacoWorkspaceEdit(edits) as MonacoWorkspaceEdit;
        await this.bulkEditService.apply(workspaceEdit, { respectAutoSaveConfig: true });
    }

    protected async provideHover(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Hover | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const lspHover = await this.getLanguageServerHover(model, position, workspacePath);
        if (lspHover) {
            return lspHover;
        }
        const word = model.getWordAtPosition(position);
        if (!word) {
            return undefined;
        }
        const symbols = await this.getCachedSymbols(workspacePath);
        const matches = this.matchingSymbols(symbols.symbols, word.word, model.uri.toString()).slice(0, 4);
        if (!matches.length) {
            return undefined;
        }
        return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: matches.map(symbol => ({
                value: this.symbolMarkdown(symbol)
            }))
        };
    }

    protected async provideDocumentHighlights(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.DocumentHighlight[] | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerDocumentHighlights(model, position, workspacePath);
    }

    protected async provideMultiDocumentHighlights(
        primaryModel: monaco.editor.ITextModel,
        position: monaco.Position,
        otherModels: monaco.editor.ITextModel[],
        token: { isCancellationRequested: boolean }
    ): Promise<Map<URI, monaco.languages.DocumentHighlight[]> | undefined> {
        if (!this.isCSharpLikeModel(primaryModel)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return undefined;
        }
        return this.getLanguageServerMultiDocumentHighlights(primaryModel, position, otherModels, workspacePath, token);
    }

    protected async provideLinks(model: monaco.editor.ITextModel): Promise<monaco.languages.ILinksList> {
        if (!this.isCSharpLikeModel(model)) {
            return { links: [], dispose: () => undefined };
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return { links: [], dispose: () => undefined };
        }
        return this.getLanguageServerDocumentLinks(model, workspacePath);
    }

    protected async resolveLink(link: monaco.languages.ILink, token: monaco.CancellationToken): Promise<monaco.languages.ILink | undefined> {
        const id = (link as monaco.languages.ILink & { __csharpKitDocumentLinkId?: string }).__csharpKitDocumentLinkId;
        const cached = id ? this.documentLinkCache.get(id) : undefined;
        if (!cached || link.url || token.isCancellationRequested) {
            return link;
        }
        const model = monaco.editor.getModel(monaco.Uri.parse(cached.documentUri));
        const workspacePath = await this.workspacePath();
        if (!model || !workspacePath || token.isCancellationRequested) {
            return link;
        }
        const resolved = await this.resolveLanguageServerDocumentLink(model, workspacePath, cached.link);
        if (!resolved) {
            return link;
        }
        if (id) {
            this.documentLinkCache.set(id, { link: resolved, documentUri: cached.documentUri });
        }
        return {
            ...link,
            url: resolved.target,
            tooltip: resolved.tooltip
        };
    }

    protected async provideDocumentColors(model: monaco.editor.ITextModel): Promise<monaco.languages.IColorInformation[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerDocumentColors(model, workspacePath);
    }

    protected async provideColorPresentations(model: monaco.editor.ITextModel, colorInfo: monaco.languages.IColorInformation): Promise<monaco.languages.IColorPresentation[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerColorPresentations(model, colorInfo, workspacePath);
    }

    protected async provideCodeLenses(model: monaco.editor.ITextModel, token: monaco.CancellationToken): Promise<monaco.languages.CodeLensList | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return undefined;
        }
        return this.getLanguageServerCodeLenses(model, workspacePath);
    }

    protected async resolveCodeLens(
        model: monaco.editor.ITextModel,
        codeLens: monaco.languages.CodeLens,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.CodeLens | undefined> {
        if (!codeLens.id || codeLens.command || token.isCancellationRequested) {
            return codeLens;
        }
        const cached = this.codeLensCache.get(codeLens.id);
        const workspacePath = await this.workspacePath();
        if (!cached || !workspacePath || token.isCancellationRequested) {
            return codeLens;
        }
        const resolved = await this.resolveLanguageServerCodeLens(model, workspacePath, cached);
        if (!resolved?.command) {
            return codeLens;
        }
        this.codeLensCache.set(codeLens.id, resolved);
        return {
            ...codeLens,
            command: this.toMonacoCommand(resolved.command, model.uri.toString())
        };
    }

    protected async provideDocumentSemanticTokens(model: monaco.editor.ITextModel, lastResultId: string | null): Promise<monaco.languages.SemanticTokens | monaco.languages.SemanticTokensEdits | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerSemanticTokens(model, workspacePath, lastResultId);
    }

    protected async provideDocumentRangeSemanticTokens(model: monaco.editor.ITextModel, range: monaco.Range): Promise<monaco.languages.SemanticTokens | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerRangeSemanticTokens(model, range, workspacePath);
    }

    protected async provideLinkedEditingRanges(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.LinkedEditingRanges | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerLinkedEditingRanges(model, position, workspacePath);
    }

    protected async provideSelectionRanges(model: monaco.editor.ITextModel, positions: monaco.Position[]): Promise<monaco.languages.SelectionRange[][]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerSelectionRanges(model, positions, workspacePath);
    }

    protected async provideDefinition(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Definition | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const lspDefinition = await this.getLanguageServerDefinitions(model, position, workspacePath);
        if (lspDefinition) {
            return lspDefinition;
        }
        const word = model.getWordAtPosition(position);
        if (!word) {
            return undefined;
        }
        const symbols = await this.getCachedSymbols(workspacePath);
        const matches = this.matchingSymbols(symbols.symbols, word.word, model.uri.toString()).slice(0, 20);
        return matches.length ? matches.map(symbol => ({
            uri: monaco.Uri.parse(FileUri.create(symbol.path).toString()),
            range: this.selectionRange(symbol)
        })) : undefined;
    }

    protected async provideDeclaration(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Definition | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerDeclarations(model, position, workspacePath);
    }

    protected async provideImplementation(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Definition | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerImplementations(model, position, workspacePath);
    }

    protected async provideTypeDefinition(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Definition | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerTypeDefinitions(model, position, workspacePath);
    }

    protected async provideReferences(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: { includeDeclaration?: boolean }
    ): Promise<monaco.languages.Location[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerReferences(model, position, workspacePath, context.includeDeclaration ?? true);
    }

    protected async provideRenameEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        newName: string
    ): Promise<monaco.languages.WorkspaceEdit & monaco.languages.Rejection> {
        if (!this.isCSharpLikeModel(model)) {
            return { edits: [], rejectReason: 'C# Kit rename only supports C# and Razor documents.' };
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return { edits: [], rejectReason: 'No workspace is open.' };
        }
        return this.getLanguageServerRenameEdits(model, position, newName, workspacePath);
    }

    protected async resolveRenameLocation(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.RenameLocation & monaco.languages.Rejection> {
        if (!this.isCSharpLikeModel(model)) {
            return { range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: '', rejectReason: 'C# Kit rename only supports C# and Razor documents.' };
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return { range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: '', rejectReason: 'No workspace is open.' };
        }
        return this.getLanguageServerPrepareRename(model, position, workspacePath);
    }

    protected async provideNewSymbolNames(
        model: monaco.editor.ITextModel,
        range: monaco.IRange,
        triggerKind: monaco.languages.NewSymbolNameTriggerKind,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.NewSymbolName[] | undefined> {
        if (!this.isCSharpLikeModel(model) || token.isCancellationRequested) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return undefined;
        }
        return this.getLanguageServerNewSymbolNames(model, range, triggerKind, workspacePath);
    }

    protected async provideCodeActions(
        model: monaco.editor.ITextModel,
        range: monaco.Range | monaco.Selection,
        context: monaco.languages.CodeActionContext
    ): Promise<monaco.languages.CodeActionList | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        return this.getLanguageServerCodeActions(model, range, context, workspacePath);
    }

    protected async resolveCodeAction(codeAction: monaco.languages.CodeAction, token: monaco.CancellationToken): Promise<monaco.languages.CodeAction | undefined> {
        const id = (codeAction as monaco.languages.CodeAction & { __csharpKitCodeActionId?: string }).__csharpKitCodeActionId;
        const cached = id ? this.codeActionCache.get(id) : undefined;
        if (!cached || codeAction.edit || token.isCancellationRequested) {
            return codeAction;
        }
        const model = monaco.editor.getModel(monaco.Uri.parse(cached.documentUri));
        const workspacePath = await this.workspacePath();
        if (!model || !workspacePath || token.isCancellationRequested) {
            return codeAction;
        }
        const resolved = await this.resolveLanguageServerCodeAction(model, workspacePath, cached.action);
        if (!resolved) {
            return codeAction;
        }
        if (id) {
            this.codeActionCache.set(id, { action: resolved, documentUri: cached.documentUri });
        }
        return {
            ...codeAction,
            title: resolved.title,
            kind: resolved.kind,
            isPreferred: resolved.isPreferred,
            disabled: resolved.disabled,
            edit: resolved.edits.length ? this.toMonacoWorkspaceEdit(resolved.edits) : undefined,
            command: resolved.command ? this.toMonacoCommand(resolved.command, model.uri.toString()) : undefined
        };
    }

    protected async provideDocumentFormattingEdits(
        model: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerFormattingEdits(model, options, workspacePath);
    }

    protected async provideDocumentRangeFormattingEdits(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerRangeFormattingEdits(model, range, options, workspacePath);
    }

    protected async provideDocumentRangesFormattingEdits(
        model: monaco.editor.ITextModel,
        ranges: monaco.Range[],
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerRangesFormattingEdits(model, ranges, options, workspacePath);
    }

    protected async provideOnTypeFormattingEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        ch: string,
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerOnTypeFormattingEdits(model, position, ch, options, workspacePath);
    }

    protected async provideInlayHints(model: monaco.editor.ITextModel, range: monaco.Range): Promise<monaco.languages.InlayHintList> {
        if (!this.isCSharpLikeModel(model)) {
            return { hints: [], dispose: () => undefined };
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return { hints: [], dispose: () => undefined };
        }
        return this.getLanguageServerInlayHints(model, range, workspacePath);
    }

    protected async provideInlineCompletions(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.InlineCompletionContext,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.InlineCompletions | undefined> {
        if (!this.isCSharpLikeModel(model) || token.isCancellationRequested || context.includeInlineCompletions === false) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return undefined;
        }
        return this.getLanguageServerInlineCompletions(model, position, context, workspacePath);
    }

    protected async resolveInlayHint(hint: monaco.languages.InlayHint, token: monaco.CancellationToken): Promise<monaco.languages.InlayHint | undefined> {
        const id = (hint as monaco.languages.InlayHint & { __csharpKitInlayHintId?: string }).__csharpKitInlayHintId;
        const cached = id ? this.inlayHintCache.get(id) : undefined;
        if (!cached || token.isCancellationRequested) {
            return hint;
        }
        const model = monaco.editor.getModel(monaco.Uri.parse(cached.documentUri));
        const workspacePath = await this.workspacePath();
        if (!model || !workspacePath || token.isCancellationRequested) {
            return hint;
        }
        const resolved = await this.resolveLanguageServerInlayHint(model, workspacePath, cached.hint);
        if (!resolved) {
            return hint;
        }
        if (id) {
            this.inlayHintCache.set(id, { hint: resolved, documentUri: cached.documentUri });
        }
        return {
            ...hint,
            label: resolved.label,
            tooltip: resolved.tooltip,
            textEdits: resolved.textEdits.length ? this.toMonacoTextEdits(resolved.textEdits) : undefined,
            kind: this.toMonacoInlayHintKind(resolved.kind),
            paddingLeft: resolved.paddingLeft,
            paddingRight: resolved.paddingRight
        };
    }

    protected async provideSignatureHelp(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context?: monaco.languages.SignatureHelpContext
    ): Promise<monaco.languages.SignatureHelpResult | undefined> {
        if (!this.isCSharpLikeModel(model)) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const lspSignatureHelp = await this.getLanguageServerSignatureHelp(model, position, workspacePath, context);
        if (lspSignatureHelp) {
            return lspSignatureHelp;
        }
        const invocation = this.methodInvocationAt(model, position);
        if (!invocation) {
            return undefined;
        }
        const symbols = await this.getCachedSymbols(workspacePath);
        const signatures = symbols.symbols
            .filter(symbol => (symbol.kind === 'method' || symbol.kind === 'test-method') && symbol.name === invocation.name && !!symbol.signature)
            .slice(0, 8)
            .map(symbol => ({
                label: symbol.signature ?? symbol.name,
                documentation: symbol.detail,
                parameters: this.signatureParameters(symbol.signature ?? '')
            }));
        if (!signatures.length) {
            return undefined;
        }
        return {
            value: {
                signatures,
                activeSignature: 0,
                activeParameter: Math.min(invocation.activeParameter, Math.max(0, signatures[0].parameters.length - 1))
            },
            dispose: () => undefined
        };
    }

    protected async provideDocumentSymbols(model: monaco.editor.ITextModel): Promise<monaco.languages.DocumentSymbol[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        const lspSymbols = await this.getLanguageServerDocumentSymbols(model, workspacePath);
        if (lspSymbols.length) {
            return lspSymbols;
        }
        const documentPath = this.normalizePath(FileUri.fsPath(model.uri.toString()));
        const symbols = await this.getCachedSymbols(workspacePath);
        return symbols.symbols
            .filter(symbol => this.normalizePath(symbol.path) === documentPath)
            .map(symbol => ({
                name: symbol.name,
                detail: symbol.containerName ?? symbol.detail,
                kind: this.toMonacoSymbolKind(symbol.kind),
                range: this.symbolRange(symbol),
                selectionRange: this.selectionRange(symbol),
                tags: [],
                children: []
            }));
    }

    protected async provideWorkspaceSymbols(params: WorkspaceSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath || token.isCancellationRequested) {
            return [];
        }
        const lspSymbols = await this.getLanguageServerWorkspaceSymbols(workspacePath, params.query, token);
        if (lspSymbols.length || token.isCancellationRequested) {
            return lspSymbols;
        }
        const query = params.query.trim().toLowerCase();
        const symbols = await this.getCachedSymbols(workspacePath);
        return symbols.symbols
            .filter(symbol => this.matchesWorkspaceSymbolQuery(symbol, query))
            .slice(0, CSHARP_WORKSPACE_SYMBOL_LIMIT)
            .map(symbol => this.toWorkspaceSymbolInformation(symbol));
    }

    protected async resolveWorkspaceSymbol(symbol: SymbolInformation, token: CancellationToken): Promise<SymbolInformation | undefined> {
        const id = (symbol as CSharpKitWorkspaceSymbolInformation).__csharpKitWorkspaceSymbolId;
        const cached = id ? this.workspaceSymbolCache.get(id) : undefined;
        if (!cached || token.isCancellationRequested) {
            return symbol;
        }
        try {
            const result = await this.service.resolveLanguageServerWorkspaceSymbol({
                workspacePath: cached.workspacePath,
                symbol: cached.symbol,
                language: cached.language
            });
            if (result.source !== 'language-server' || !result.symbol || token.isCancellationRequested) {
                return symbol;
            }
            return this.toLanguageServerWorkspaceSymbolInformation(result.symbol, cached.workspacePath, cached.language);
        } catch {
            return symbol;
        }
    }

    protected async provideFoldingRanges(
        model: monaco.editor.ITextModel,
        _context: monaco.languages.FoldingContext
    ): Promise<monaco.languages.FoldingRange[]> {
        if (!this.isCSharpLikeModel(model)) {
            return [];
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return [];
        }
        return this.getLanguageServerFoldingRanges(model, workspacePath);
    }

    protected async getLanguageServerSignatureHelp(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        workspacePath: string,
        context?: monaco.languages.SignatureHelpContext
    ): Promise<monaco.languages.SignatureHelpResult | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerSignatureHelp({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model),
                signatureHelpContext: context ? this.toLanguageServerSignatureHelpContext(context) : undefined
            });
            if (result.source !== 'language-server' || !result.signatures.length) {
                return undefined;
            }
            return {
                value: {
                    signatures: result.signatures.map(signature => ({
                        label: signature.label,
                        documentation: signature.documentation,
                        parameters: signature.parameters.map(parameter => ({ label: parameter }))
                    })),
                    activeSignature: result.activeSignature,
                    activeParameter: result.activeParameter
                },
                dispose: () => undefined
            };
        } catch {
            return undefined;
        }
    }

    protected toLanguageServerSignatureHelpContext(context: monaco.languages.SignatureHelpContext): CSharpLanguageServerSignatureHelpContext {
        return {
            triggerKind: this.toLanguageServerSignatureHelpTriggerKind(context.triggerKind),
            triggerCharacter: context.triggerCharacter,
            isRetrigger: context.isRetrigger
        };
    }

    protected toCSharpCompletionContext(context?: monaco.languages.CompletionContext): CSharpLanguageServerCompletionContext | undefined {
        if (!context) {
            return undefined;
        }
        return {
            triggerKind: this.toLanguageServerCompletionTriggerKind(context.triggerKind),
            triggerCharacter: context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter ? context.triggerCharacter : undefined
        };
    }

    protected toLanguageServerCompletionTriggerKind(triggerKind: monaco.languages.CompletionTriggerKind): CSharpLanguageServerCompletionContext['triggerKind'] {
        switch (triggerKind) {
            case monaco.languages.CompletionTriggerKind.TriggerCharacter:
                return 'trigger-character';
            case monaco.languages.CompletionTriggerKind.TriggerForIncompleteCompletions:
                return 'trigger-for-incomplete-completions';
            case monaco.languages.CompletionTriggerKind.Invoke:
            default:
                return 'invoked';
        }
    }

    protected toLanguageServerSignatureHelpTriggerKind(triggerKind: monaco.languages.SignatureHelpTriggerKind): CSharpLanguageServerSignatureHelpTriggerKind {
        switch (triggerKind) {
            case monaco.languages.SignatureHelpTriggerKind.TriggerCharacter:
                return 'trigger-character';
            case monaco.languages.SignatureHelpTriggerKind.ContentChange:
                return 'content-change';
            case monaco.languages.SignatureHelpTriggerKind.Invoke:
            default:
                return 'invoked';
        }
    }

    protected async getLanguageServerReferences(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        workspacePath: string,
        includeDeclaration: boolean
    ): Promise<monaco.languages.Location[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerReferences({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                includeDeclaration,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.locations.length) {
                return [];
            }
            return result.locations.map(location => ({
                uri: monaco.Uri.parse(location.uri),
                range: this.symbolRange(location.range)
            }));
        } catch {
            return [];
        }
    }

    protected async getLanguageServerMultiDocumentHighlights(
        primaryModel: monaco.editor.ITextModel,
        position: monaco.Position,
        otherModels: monaco.editor.ITextModel[],
        workspacePath: string,
        token: { isCancellationRequested: boolean }
    ): Promise<Map<URI, monaco.languages.DocumentHighlight[]> | undefined> {
        const candidateModels = [primaryModel, ...otherModels]
            .filter(model => this.isCSharpLikeModel(model) && model.uri.scheme === 'file' && !model.isDisposed());
        if (!candidateModels.length) {
            return undefined;
        }
        const modelByUri = new Map(candidateModels.map(model => [model.uri.toString(), model]));
        const locations = await this.getLanguageServerReferences(primaryModel, position, workspacePath, true);
        if (token.isCancellationRequested) {
            return undefined;
        }
        const result = new Map<URI, monaco.languages.DocumentHighlight[]>();
        for (const location of locations) {
            const targetModel = modelByUri.get(location.uri.toString());
            if (!targetModel) {
                continue;
            }
            const uri = targetModel.uri as unknown as URI;
            const highlights = result.get(uri) ?? [];
            highlights.push({
                range: location.range,
                kind: monaco.languages.DocumentHighlightKind.Text
            });
            result.set(uri, highlights);
        }
        return result.size ? result : undefined;
    }

    protected async getLanguageServerWorkspaceSymbols(workspacePath: string, query: string, token: CancellationToken): Promise<SymbolInformation[]> {
        const results = await Promise.all((['csharp', 'razor'] as const).map(async language => {
            try {
                const result = await this.service.getLanguageServerWorkspaceSymbols({
                    workspacePath,
                    query,
                    language
                });
                if (result.source !== 'language-server' || token.isCancellationRequested) {
                    return [];
                }
                return result.symbols.map(symbol => this.toLanguageServerWorkspaceSymbolInformation(symbol, workspacePath, language));
            } catch {
                return [];
            }
        }));
        const seen = new Set<string>();
        const symbols: SymbolInformation[] = [];
        for (const symbol of results.flat()) {
            const key = `${symbol.name}|${symbol.kind}|${symbol.location.uri}|${symbol.location.range.start.line}|${symbol.location.range.start.character}`;
            if (!seen.has(key)) {
                seen.add(key);
                symbols.push(symbol);
            }
        }
        return symbols.slice(0, CSHARP_WORKSPACE_SYMBOL_LIMIT);
    }

    protected async getLanguageServerRenameEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        newName: string,
        workspacePath: string
    ): Promise<monaco.languages.WorkspaceEdit & monaco.languages.Rejection> {
        if (model.uri.scheme !== 'file') {
            return { edits: [], rejectReason: 'C# Kit rename only supports file-backed documents.' };
        }
        try {
            const result = await this.service.getLanguageServerRenameEdits({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                newName,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.edits.length) {
                return { edits: [], rejectReason: result.detail };
            }
            const edits: monaco.languages.IWorkspaceTextEdit[] = result.edits.map(edit => ({
                resource: monaco.Uri.parse(edit.uri),
                textEdit: {
                    range: this.symbolRange(edit.range),
                    text: edit.newText
                },
                versionId: undefined
            }));
            return { edits };
        } catch {
            return { edits: [], rejectReason: 'C# language-server rename is unavailable.' };
        }
    }

    protected async getLanguageServerPrepareRename(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.RenameLocation & monaco.languages.Rejection> {
        const fallbackRange = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
        if (model.uri.scheme !== 'file') {
            return { range: fallbackRange, text: '', rejectReason: 'C# language-server rename only supports file documents.' };
        }
        try {
            const result = await this.service.getLanguageServerPrepareRename({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return { range: fallbackRange, text: '', rejectReason: result.detail };
            }
            if (result.defaultBehavior) {
                const word = model.getWordAtPosition(position);
                if (word) {
                    const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    return { range, text: model.getValueInRange(range) };
                }
            }
            if (result.range) {
                const range = this.symbolRange(result.range);
                return {
                    range,
                    text: result.placeholder ?? model.getValueInRange(range)
                };
            }
            return { range: fallbackRange, text: '', rejectReason: result.detail };
        } catch {
            return { range: fallbackRange, text: '', rejectReason: 'C# language-server prepare rename is unavailable.' };
        }
    }

    protected async getLanguageServerCodeActions(
        model: monaco.editor.ITextModel,
        range: monaco.Range | monaco.Selection,
        context: monaco.languages.CodeActionContext,
        workspacePath: string
    ): Promise<monaco.languages.CodeActionList | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerCodeActions({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                diagnostics: context.markers.map(marker => this.toLanguageServerDiagnostic(marker)),
                only: context.only,
                triggerKind: context.trigger === monaco.languages.CodeActionTriggerType.Auto ? 'auto' : 'invoke',
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.actions.length) {
                return undefined;
            }
            const ids: string[] = [];
            const documentUri = model.uri.toString();
            const actions = result.actions.map(action => {
                const id = `csharp-kit-code-action-${++this.codeActionId}`;
                ids.push(id);
                this.codeActionCache.set(id, { action, documentUri });
                return {
                    title: action.title,
                    kind: action.kind,
                    isPreferred: action.isPreferred,
                    disabled: action.disabled,
                    edit: action.edits.length ? this.toMonacoWorkspaceEdit(action.edits) : undefined,
                    command: action.command ? this.toMonacoCommand(action.command, model.uri.toString()) : undefined,
                    __csharpKitCodeActionId: id
                } as monaco.languages.CodeAction;
            });
            return {
                actions,
                dispose: () => {
                    for (const id of ids) {
                        this.codeActionCache.delete(id);
                    }
                }
            };
        } catch {
            return undefined;
        }
    }

    protected async resolveLanguageServerCodeAction(
        model: monaco.editor.ITextModel,
        workspacePath: string,
        action: CSharpLanguageServerCodeAction
    ): Promise<CSharpLanguageServerCodeAction | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.resolveLanguageServerCodeAction({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                action,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? result.action : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerNewSymbolNames(
        model: monaco.editor.ITextModel,
        range: monaco.IRange,
        triggerKind: monaco.languages.NewSymbolNameTriggerKind,
        workspacePath: string
    ): Promise<monaco.languages.NewSymbolName[] | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerNewSymbolNames({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                triggerKind: triggerKind === monaco.languages.NewSymbolNameTriggerKind.Automatic ? 'automatic' : 'invoke',
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' && result.names.length
                ? result.names.map(name => this.toMonacoNewSymbolName(name))
                : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerFormattingEdits(
        model: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions,
        workspacePath: string
    ): Promise<monaco.languages.TextEdit[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerFormattingEdits({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                options: {
                    tabSize: options.tabSize,
                    insertSpaces: options.insertSpaces
                },
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? this.toMonacoTextEdits(result.edits) : [];
        } catch {
            return [];
        }
    }

    protected async getLanguageServerRangeFormattingEdits(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        options: monaco.languages.FormattingOptions,
        workspacePath: string
    ): Promise<monaco.languages.TextEdit[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerRangeFormattingEdits({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                options: {
                    tabSize: options.tabSize,
                    insertSpaces: options.insertSpaces
                },
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? this.toMonacoTextEdits(result.edits) : [];
        } catch {
            return [];
        }
    }

    protected async getLanguageServerRangesFormattingEdits(
        model: monaco.editor.ITextModel,
        ranges: monaco.Range[],
        options: monaco.languages.FormattingOptions,
        workspacePath: string
    ): Promise<monaco.languages.TextEdit[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerRangesFormattingEdits({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                ranges: ranges.map(range => this.toCSharpRange(range)),
                options: {
                    tabSize: options.tabSize,
                    insertSpaces: options.insertSpaces
                },
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? this.toMonacoTextEdits(result.edits) : [];
        } catch {
            return [];
        }
    }

    protected async getLanguageServerOnTypeFormattingEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        ch: string,
        options: monaco.languages.FormattingOptions,
        workspacePath: string
    ): Promise<monaco.languages.TextEdit[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerOnTypeFormattingEdits({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                ch,
                options: {
                    tabSize: options.tabSize,
                    insertSpaces: options.insertSpaces
                },
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? this.toMonacoTextEdits(result.edits) : [];
        } catch {
            return [];
        }
    }

    protected async getLanguageServerInlayHints(model: monaco.editor.ITextModel, range: monaco.Range, workspacePath: string): Promise<monaco.languages.InlayHintList> {
        if (model.uri.scheme !== 'file') {
            return { hints: [], dispose: () => undefined };
        }
        try {
            const result = await this.service.getLanguageServerInlayHints({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return { hints: [], dispose: () => undefined };
            }
            const ids: string[] = [];
            const documentUri = model.uri.toString();
            return {
                hints: result.hints.map(hint => {
                    const id = `csharp-kit-inlay-hint-${++this.inlayHintId}`;
                    ids.push(id);
                    this.inlayHintCache.set(id, { hint, documentUri });
                    return {
                        label: hint.label,
                        tooltip: hint.tooltip,
                        position: new monaco.Position(hint.position.line, hint.position.column),
                        kind: this.toMonacoInlayHintKind(hint.kind),
                        textEdits: hint.textEdits.length ? this.toMonacoTextEdits(hint.textEdits) : undefined,
                        paddingLeft: hint.paddingLeft,
                        paddingRight: hint.paddingRight,
                        __csharpKitInlayHintId: id
                    } as monaco.languages.InlayHint;
                }),
                dispose: () => {
                    for (const id of ids) {
                        this.inlayHintCache.delete(id);
                    }
                }
            };
        } catch {
            return { hints: [], dispose: () => undefined };
        }
    }

    protected async getLanguageServerInlineCompletions(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.InlineCompletionContext,
        workspacePath: string
    ): Promise<monaco.languages.InlineCompletions | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerInlineCompletions({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                inlineCompletionContext: this.toCSharpInlineCompletionContext(context),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.items.length) {
                return undefined;
            }
            const documentUri = model.uri.toString();
            return {
                items: result.items.map(item => this.toMonacoInlineCompletion(item, documentUri)),
                suppressSuggestions: result.suppressSuggestions
            };
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerInlineValues(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        context: InlineValueContext,
        workspacePath: string
    ): Promise<InlineValue[] | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerInlineValues({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                context: {
                    frameId: context.frameId,
                    stoppedLocation: this.toCSharpRange(context.stoppedLocation as monaco.Range)
                },
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server'
                ? result.inlineValues.map(inlineValue => this.toMonacoInlineValue(inlineValue))
                : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerEvaluatableExpression(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        workspacePath: string
    ): Promise<EvaluatableExpression | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerEvaluatableExpression({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' && result.expression
                ? this.toMonacoEvaluatableExpression(result.expression)
                : undefined;
        } catch {
            return undefined;
        }
    }

    protected async resolveLanguageServerInlayHint(
        model: monaco.editor.ITextModel,
        workspacePath: string,
        hint: CSharpLanguageServerInlayHint
    ): Promise<CSharpLanguageServerInlayHint | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.resolveLanguageServerInlayHint({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                hint,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? result.hint : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerCompletions(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        workspacePath: string,
        range: monaco.Range,
        context?: monaco.languages.CompletionContext
    ): Promise<monaco.languages.CompletionList | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerCompletions({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model),
                completionContext: this.toCSharpCompletionContext(context)
            });
            if (result.source !== 'language-server' || !result.items.length) {
                return undefined;
            }
            const ids: string[] = [];
            const documentUri = model.uri.toString();
            const suggestions = result.items.map(item => {
                const id = `csharp-kit-completion-item-${++this.completionItemId}`;
                ids.push(id);
                this.completionItemCache.set(id, { item, documentUri });
                return {
                    ...this.toCompletionItem(item, range, documentUri),
                    __csharpKitCompletionItemId: id
                } as monaco.languages.CompletionItem;
            });
            return {
                suggestions,
                incomplete: result.isIncomplete,
                dispose: () => {
                    for (const id of ids) {
                        this.completionItemCache.delete(id);
                    }
                }
            };
        } catch {
            return undefined;
        }
    }

    protected async resolveLanguageServerCompletionItem(
        model: monaco.editor.ITextModel,
        workspacePath: string,
        item: CSharpIntelliSenseItem
    ): Promise<CSharpIntelliSenseItem | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.resolveLanguageServerCompletionItem({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                item,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? result.item : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerHover(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.Hover | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerHover({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.contents.length) {
                return undefined;
            }
            return {
                range: result.range ? this.symbolRange(result.range) : undefined,
                contents: result.contents.map(value => ({ value }))
            };
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerDeclarations(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.Definition | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerDeclarations({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.locations.length) {
                return undefined;
            }
            return result.locations.map(location => ({
                uri: monaco.Uri.parse(location.uri),
                range: this.symbolRange(location.range)
            }));
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerImplementations(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.Definition | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerImplementations({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.locations.length) {
                return undefined;
            }
            return result.locations.map(location => ({
                uri: monaco.Uri.parse(location.uri),
                range: this.symbolRange(location.range)
            }));
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerTypeDefinitions(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.Definition | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerTypeDefinitions({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.locations.length) {
                return undefined;
            }
            return result.locations.map(location => ({
                uri: monaco.Uri.parse(location.uri),
                range: this.symbolRange(location.range)
            }));
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerDefinitions(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.Definition | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerDefinitions({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.locations.length) {
                return undefined;
            }
            return result.locations.map(location => ({
                uri: monaco.Uri.parse(location.uri),
                range: this.symbolRange(location.range)
            }));
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerDocumentHighlights(model: monaco.editor.ITextModel, position: monaco.Position, workspacePath: string): Promise<monaco.languages.DocumentHighlight[] | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerDocumentHighlights({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.highlights.length) {
                return undefined;
            }
            return result.highlights.map(highlight => ({
                range: this.symbolRange(highlight.range),
                kind: this.toMonacoDocumentHighlightKind(highlight.kind)
            }));
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerDocumentLinks(model: monaco.editor.ITextModel, workspacePath: string): Promise<monaco.languages.ILinksList> {
        if (model.uri.scheme !== 'file') {
            return { links: [], dispose: () => undefined };
        }
        try {
            const result = await this.service.getLanguageServerDocumentLinks({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return { links: [], dispose: () => undefined };
            }
            const ids: string[] = [];
            const documentUri = model.uri.toString();
            return {
                links: result.links.map(link => {
                    const id = `csharp-kit-document-link-${++this.documentLinkId}`;
                    ids.push(id);
                    this.documentLinkCache.set(id, { link, documentUri });
                    return {
                        range: this.symbolRange(link.range),
                        url: link.target,
                        tooltip: link.tooltip,
                        __csharpKitDocumentLinkId: id
                    } as monaco.languages.ILink;
                }),
                dispose: () => {
                    for (const id of ids) {
                        this.documentLinkCache.delete(id);
                    }
                }
            };
        } catch {
            return { links: [], dispose: () => undefined };
        }
    }

    protected async resolveLanguageServerDocumentLink(
        model: monaco.editor.ITextModel,
        workspacePath: string,
        link: CSharpLanguageServerDocumentLink
    ): Promise<CSharpLanguageServerDocumentLink | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.resolveLanguageServerDocumentLink({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                link,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? result.link : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerDocumentColors(model: monaco.editor.ITextModel, workspacePath: string): Promise<monaco.languages.IColorInformation[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerDocumentColors({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return [];
            }
            return result.colors.map(color => ({
                range: this.symbolRange(color.range),
                color: color.color
            }));
        } catch {
            return [];
        }
    }

    protected async getLanguageServerColorPresentations(
        model: monaco.editor.ITextModel,
        colorInfo: monaco.languages.IColorInformation,
        workspacePath: string
    ): Promise<monaco.languages.IColorPresentation[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerColorPresentations({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(colorInfo.range as monaco.Range),
                color: colorInfo.color,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return [];
            }
            return result.presentations.map(presentation => ({
                label: presentation.label,
                textEdit: presentation.textEdit ? this.toMonacoTextEdits([presentation.textEdit])[0] : undefined,
                additionalTextEdits: presentation.additionalTextEdits.length ? this.toMonacoTextEdits(presentation.additionalTextEdits) : undefined
            }));
        } catch {
            return [];
        }
    }

    protected async getLanguageServerCodeLenses(model: monaco.editor.ITextModel, workspacePath: string): Promise<monaco.languages.CodeLensList | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerCodeLenses({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.lenses.length) {
                return undefined;
            }
            const ids: string[] = [];
            const lenses = result.lenses.map(lens => {
                const id = `csharp-kit-codelens-${++this.codeLensId}`;
                ids.push(id);
                this.codeLensCache.set(id, lens);
                return {
                    id,
                    range: this.symbolRange(lens.range),
                    command: lens.command ? this.toMonacoCommand(lens.command, model.uri.toString()) : undefined
                };
            });
            return {
                lenses,
                dispose: () => {
                    for (const id of ids) {
                        this.codeLensCache.delete(id);
                    }
                }
            };
        } catch {
            return undefined;
        }
    }

    protected async resolveLanguageServerCodeLens(
        model: monaco.editor.ITextModel,
        workspacePath: string,
        lens: CSharpLanguageServerCodeLens
    ): Promise<CSharpLanguageServerCodeLens | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.resolveLanguageServerCodeLens({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                lens,
                language: this.languageServerLanguage(model)
            });
            return result.source === 'language-server' ? result.lens : undefined;
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerSemanticTokens(model: monaco.editor.ITextModel, workspacePath: string, previousResultId: string | null): Promise<monaco.languages.SemanticTokens | monaco.languages.SemanticTokensEdits | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerSemanticTokens({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                ...(previousResultId ? { previousResultId } : {}),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return undefined;
            }
            if (result.edits) {
                return {
                    resultId: result.resultId,
                    edits: result.edits.map(edit => ({
                        start: edit.start,
                        deleteCount: edit.deleteCount,
                        ...(edit.data ? { data: Uint32Array.from(edit.data) } : {})
                    }))
                };
            }
            return {
                resultId: result.resultId,
                data: Uint32Array.from(result.data)
            };
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerRangeSemanticTokens(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        workspacePath: string
    ): Promise<monaco.languages.SemanticTokens | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerRangeSemanticTokens({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                range: this.toCSharpRange(range),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return undefined;
            }
            return {
                resultId: result.resultId,
                data: Uint32Array.from(result.data)
            };
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerLinkedEditingRanges(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        workspacePath: string
    ): Promise<monaco.languages.LinkedEditingRanges | undefined> {
        if (model.uri.scheme !== 'file') {
            return undefined;
        }
        try {
            const result = await this.service.getLanguageServerLinkedEditingRanges({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                line: position.lineNumber,
                column: position.column,
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server' || !result.ranges.length) {
                return undefined;
            }
            return {
                ranges: result.ranges.map(range => this.symbolRange(range)),
                wordPattern: this.toWordPattern(result.wordPattern)
            };
        } catch {
            return undefined;
        }
    }

    protected async getLanguageServerSelectionRanges(model: monaco.editor.ITextModel, positions: monaco.Position[], workspacePath: string): Promise<monaco.languages.SelectionRange[][]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const result = await this.service.getLanguageServerSelectionRanges({
                workspacePath,
                documentPath: FileUri.fsPath(model.uri.toString()),
                content: model.getValue(),
                positions: positions.map(position => ({
                    line: position.lineNumber,
                    column: position.column
                })),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return [];
            }
            return result.ranges.map(chain => chain.map(range => ({
                range: this.symbolRange(range)
            })));
        } catch {
            return [];
        }
    }

    protected async getLanguageServerDocumentSymbols(model: monaco.editor.ITextModel, workspacePath: string): Promise<monaco.languages.DocumentSymbol[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const documentPath = FileUri.fsPath(model.uri.toString());
            const result = await this.service.getLanguageServerDocumentSymbols({
                workspacePath,
                documentPath,
                content: model.getValue(),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return [];
            }
            return result.symbols.map(symbol => this.toLanguageServerDocumentSymbol(symbol));
        } catch {
            return [];
        }
    }

    protected async getLanguageServerFoldingRanges(model: monaco.editor.ITextModel, workspacePath: string): Promise<monaco.languages.FoldingRange[]> {
        if (model.uri.scheme !== 'file') {
            return [];
        }
        try {
            const documentPath = FileUri.fsPath(model.uri.toString());
            const result = await this.service.getLanguageServerFoldingRanges({
                workspacePath,
                documentPath,
                content: model.getValue(),
                language: this.languageServerLanguage(model)
            });
            if (result.source !== 'language-server') {
                return [];
            }
            return result.ranges.map(range => ({
                start: range.startLine,
                end: range.endLine,
                kind: this.toMonacoFoldingRangeKind(range.kind)
            }));
        } catch {
            return [];
        }
    }

    protected async getCachedIntelliSense(workspacePath: string): Promise<CSharpIntelliSenseResult> {
        const now = Date.now();
        if (!this.cache || this.cache.workspacePath !== workspacePath || now - this.cache.loadedAt > CSHARP_CACHE_TTL_MS) {
            this.cache = {
                workspacePath,
                loadedAt: now,
                promise: this.service.getIntelliSense({ workspacePath })
            };
        }
        return this.cache.promise;
    }

    protected async getCachedSymbols(workspacePath: string): Promise<CSharpWorkspaceSymbolResult> {
        const now = Date.now();
        if (!this.symbolCache || this.symbolCache.workspacePath !== workspacePath || now - this.symbolCache.loadedAt > CSHARP_CACHE_TTL_MS) {
            this.symbolCache = {
                workspacePath,
                loadedAt: now,
                promise: this.service.getWorkspaceSymbols({ workspacePath })
            };
        }
        return this.symbolCache.promise;
    }

    protected toCompletionItem(item: CSharpIntelliSenseItem, range: monaco.Range, documentUri?: string): monaco.languages.CompletionItem {
        return {
            label: item.label,
            insertText: item.insertText,
            kind: this.toMonacoKind(item.kind),
            detail: item.detail,
            documentation: item.documentation,
            sortText: item.sortText ?? this.sortPrefix(item.kind) + item.label,
            filterText: item.filterText,
            preselect: item.preselect,
            commitCharacters: item.commitCharacters,
            range: item.textEdit ? this.symbolRange(item.textEdit.range) : range,
            insertTextRules: item.kind === 'snippet' || item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            additionalTextEdits: item.additionalTextEdits?.length ? this.toMonacoTextEdits(item.additionalTextEdits) : undefined,
            command: item.command ? this.toMonacoCommand(item.command, documentUri) : undefined
        };
    }

    protected toMonacoKind(kind: CSharpIntelliSenseItemKind): monaco.languages.CompletionItemKind {
        switch (kind) {
            case 'namespace':
                return monaco.languages.CompletionItemKind.Module;
            case 'class':
            case 'record':
                return monaco.languages.CompletionItemKind.Class;
            case 'interface':
                return monaco.languages.CompletionItemKind.Interface;
            case 'struct':
                return monaco.languages.CompletionItemKind.Struct;
            case 'enum':
                return monaco.languages.CompletionItemKind.Enum;
            case 'method':
                return monaco.languages.CompletionItemKind.Method;
            case 'property':
                return monaco.languages.CompletionItemKind.Property;
            case 'package':
                return monaco.languages.CompletionItemKind.Reference;
            case 'snippet':
                return monaco.languages.CompletionItemKind.Snippet;
            case 'keyword':
            default:
                return monaco.languages.CompletionItemKind.Keyword;
        }
    }

    protected toMonacoSymbolKind(kind: CSharpWorkspaceSymbolKind): monaco.languages.SymbolKind {
        switch (kind) {
            case 'namespace':
                return monaco.languages.SymbolKind.Namespace;
            case 'class':
            case 'record':
                return monaco.languages.SymbolKind.Class;
            case 'interface':
                return monaco.languages.SymbolKind.Interface;
            case 'struct':
                return monaco.languages.SymbolKind.Struct;
            case 'enum':
                return monaco.languages.SymbolKind.Enum;
            case 'method':
            case 'test-method':
                return monaco.languages.SymbolKind.Method;
            case 'aspnet-endpoint':
                return monaco.languages.SymbolKind.Function;
            case 'razor-page':
                return monaco.languages.SymbolKind.File;
            case 'razor-model':
                return monaco.languages.SymbolKind.Class;
            case 'razor-inject':
                return monaco.languages.SymbolKind.Variable;
            case 'razor-component':
                return monaco.languages.SymbolKind.Interface;
            case 'razor-directive':
                return monaco.languages.SymbolKind.String;
            case 'property':
            default:
                return monaco.languages.SymbolKind.Property;
        }
    }

    protected toLanguageServerDocumentSymbol(symbol: CSharpLanguageServerDocumentSymbol): monaco.languages.DocumentSymbol {
        return {
            name: symbol.name,
            detail: symbol.detail ?? '',
            kind: this.toMonacoSymbolKind(symbol.kind),
            range: this.symbolRange(symbol.range),
            selectionRange: this.symbolRange(symbol.selectionRange),
            tags: [],
            children: symbol.children.map(child => this.toLanguageServerDocumentSymbol(child))
        };
    }

    protected toLanguageServerWorkspaceSymbolInformation(
        symbol: CSharpLanguageServerWorkspaceSymbol,
        workspacePath?: string,
        language?: CSharpLanguageServerAdapterLanguage
    ): SymbolInformation {
        const result: CSharpKitWorkspaceSymbolInformation = {
            name: symbol.name,
            kind: this.toLspSymbolKind(symbol.kind),
            location: {
                uri: symbol.uri,
                range: this.toLspRange(symbol.range)
            },
            containerName: symbol.containerName,
            tags: symbol.tags?.map(tag => tag as 1)
        };
        if (workspacePath && language) {
            const id = `csharp-kit-workspace-symbol-${++this.workspaceSymbolId}`;
            this.workspaceSymbolCache.set(id, { symbol, workspacePath, language });
            result.__csharpKitWorkspaceSymbolId = id;
        }
        return result;
    }

    protected toWorkspaceSymbolInformation(symbol: CSharpWorkspaceSymbol): SymbolInformation {
        return {
            name: symbol.name,
            kind: this.toLspSymbolKind(symbol.kind),
            location: {
                uri: FileUri.create(symbol.path).toString(),
                range: this.toLspRange(symbol)
            },
            containerName: symbol.containerName
        };
    }

    protected toLspSymbolKind(kind: CSharpWorkspaceSymbolKind | number): LspSymbolKind {
        if (typeof kind === 'number') {
            return Number.isFinite(kind) && kind >= LspSymbolKind.File && kind <= LspSymbolKind.TypeParameter
                ? kind as LspSymbolKind
                : LspSymbolKind.Property;
        }
        switch (kind) {
            case 'namespace':
                return LspSymbolKind.Namespace;
            case 'class':
            case 'record':
            case 'razor-model':
                return LspSymbolKind.Class;
            case 'interface':
            case 'razor-component':
                return LspSymbolKind.Interface;
            case 'struct':
                return LspSymbolKind.Struct;
            case 'enum':
                return LspSymbolKind.Enum;
            case 'method':
            case 'test-method':
                return LspSymbolKind.Method;
            case 'aspnet-endpoint':
                return LspSymbolKind.Function;
            case 'razor-page':
                return LspSymbolKind.File;
            case 'razor-inject':
                return LspSymbolKind.Variable;
            case 'razor-directive':
                return LspSymbolKind.String;
            case 'property':
            default:
                return LspSymbolKind.Property;
        }
    }

    protected toLspRange(range: CSharpWorkspaceSymbolRange): SymbolInformation['location']['range'] {
        return {
            start: {
                line: Math.max(0, range.line - 1),
                character: Math.max(0, range.column - 1)
            },
            end: {
                line: Math.max(0, range.endLine - 1),
                character: Math.max(0, range.endColumn - 1)
            }
        };
    }

    protected matchesWorkspaceSymbolQuery(symbol: CSharpWorkspaceSymbol, query: string): boolean {
        if (!query) {
            return true;
        }
        return symbol.name.toLowerCase().includes(query)
            || Boolean(symbol.containerName?.toLowerCase().includes(query))
            || symbol.path.replace(/\\/g, '/').toLowerCase().includes(query);
    }

    protected sortPrefix(kind: CSharpIntelliSenseItemKind): string {
        switch (kind) {
            case 'snippet':
                return '0_';
            case 'class':
            case 'interface':
            case 'record':
            case 'struct':
            case 'enum':
                return '1_';
            case 'method':
            case 'property':
                return '2_';
            case 'namespace':
                return '3_';
            default:
                return '4_';
        }
    }

    protected completionRange(model: monaco.editor.ITextModel, position: monaco.Position): monaco.Range {
        const word = model.getWordUntilPosition(position);
        return new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    }

    protected isCSharpLikeModel(model: monaco.editor.ITextModel): boolean {
        const uri = model.uri.toString().toLowerCase();
        return model.getLanguageId() === CSHARP_LANGUAGE_ID
            || uri.endsWith('.cs')
            || uri.endsWith('.cshtml')
            || uri.endsWith('.razor');
    }

    protected languageServerLanguage(model: monaco.editor.ITextModel): 'csharp' | 'razor' {
        const uri = model.uri.toString().toLowerCase();
        return uri.endsWith('.cshtml') || uri.endsWith('.razor') ? 'razor' : 'csharp';
    }

    protected matchingSymbols(symbols: readonly CSharpWorkspaceSymbol[], word: string, modelUri: string): CSharpWorkspaceSymbol[] {
        const modelPath = this.normalizePath(FileUri.fsPath(modelUri));
        return symbols
            .filter(symbol => symbol.name === word)
            .sort((left, right) => {
                const leftSameFile = this.normalizePath(left.path) === modelPath ? 0 : 1;
                const rightSameFile = this.normalizePath(right.path) === modelPath ? 0 : 1;
                return leftSameFile - rightSameFile
                    || this.symbolRank(left.kind) - this.symbolRank(right.kind)
                    || left.path.localeCompare(right.path)
                    || left.line - right.line;
            });
    }

    protected symbolRank(kind: CSharpWorkspaceSymbolKind): number {
        switch (kind) {
            case 'class':
            case 'interface':
            case 'record':
            case 'struct':
            case 'enum':
                return 0;
            case 'method':
            case 'test-method':
            case 'property':
            case 'aspnet-endpoint':
                return 1;
            default:
                return 2;
        }
    }

    protected symbolRange(symbol: CSharpWorkspaceSymbolRange): monaco.Range {
        return new monaco.Range(symbol.line, symbol.column, symbol.endLine, symbol.endColumn);
    }

    protected toCSharpRange(range: monaco.IRange | monaco.Selection): CSharpWorkspaceSymbolRange {
        return {
            line: range.startLineNumber,
            column: range.startColumn,
            endLine: range.endLineNumber,
            endColumn: range.endColumn
        };
    }

    protected toLanguageServerDiagnostic(marker: monaco.editor.IMarkerData): CSharpLanguageServerDiagnostic {
        return {
            range: {
                line: marker.startLineNumber,
                column: marker.startColumn,
                endLine: marker.endLineNumber,
                endColumn: marker.endColumn
            },
            severity: this.toLanguageServerDiagnosticSeverity(marker.severity),
            code: this.markerCode(marker.code),
            source: marker.source,
            message: marker.message
        };
    }

    protected toLanguageServerDiagnosticSeverity(severity: monaco.MarkerSeverity): number | undefined {
        switch (severity) {
            case monaco.MarkerSeverity.Error:
                return 1;
            case monaco.MarkerSeverity.Warning:
                return 2;
            case monaco.MarkerSeverity.Info:
                return 3;
            case monaco.MarkerSeverity.Hint:
                return 4;
            default:
                return undefined;
        }
    }

    protected markerCode(code: monaco.editor.IMarkerData['code']): string | number | undefined {
        if (typeof code === 'string' || typeof code === 'number') {
            return code;
        }
        return code?.value;
    }

    protected toMonacoTextEdits(edits: Array<{ range: CSharpWorkspaceSymbolRange; newText: string }>): monaco.languages.TextEdit[] {
        return edits.map(edit => ({
            range: this.symbolRange(edit.range),
            text: edit.newText
        }));
    }

    protected toMonacoCommand(command: { title: string; command: string; arguments?: unknown[] }, documentUri?: string): monaco.languages.Command {
        return {
            id: CSHARP_LSP_EXECUTE_COMMAND_ID,
            title: command.title,
            tooltip: command.title,
            arguments: [{
                command: command.command,
                arguments: command.arguments,
                documentUri
            } satisfies CSharpLanguageServerCommandPayload]
        };
    }

    protected semanticTokensLegend(): monaco.languages.SemanticTokensLegend {
        return {
            tokenTypes: [...CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES],
            tokenModifiers: [...CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS]
        };
    }

    protected toWordPattern(pattern: string | undefined): RegExp | undefined {
        if (!pattern) {
            return undefined;
        }
        try {
            return new RegExp(pattern);
        } catch {
            return undefined;
        }
    }

    protected toMonacoWorkspaceEdit(edits: Array<{ uri: string; range: CSharpWorkspaceSymbolRange; newText: string }>): monaco.languages.WorkspaceEdit {
        return {
            edits: edits.map(edit => ({
                resource: monaco.Uri.parse(edit.uri),
                textEdit: {
                    range: this.symbolRange(edit.range),
                    text: edit.newText
                },
                versionId: undefined
            }))
        };
    }

    protected toMonacoDocumentHighlightKind(kind: 'text' | 'read' | 'write'): monaco.languages.DocumentHighlightKind {
        switch (kind) {
            case 'read':
                return monaco.languages.DocumentHighlightKind.Read;
            case 'write':
                return monaco.languages.DocumentHighlightKind.Write;
            default:
                return monaco.languages.DocumentHighlightKind.Text;
        }
    }

    protected toMonacoFoldingRangeKind(kind: 'comment' | 'imports' | 'region' | undefined): monaco.languages.FoldingRangeKind | undefined {
        switch (kind) {
            case 'comment':
                return monaco.languages.FoldingRangeKind.Comment;
            case 'imports':
                return monaco.languages.FoldingRangeKind.Imports;
            case 'region':
                return monaco.languages.FoldingRangeKind.Region;
            default:
                return undefined;
        }
    }

    protected toMonacoInlayHintKind(kind: 'type' | 'parameter' | undefined): monaco.languages.InlayHintKind | undefined {
        switch (kind) {
            case 'type':
                return monaco.languages.InlayHintKind.Type;
            case 'parameter':
                return monaco.languages.InlayHintKind.Parameter;
            default:
                return undefined;
        }
    }

    protected toCSharpInlineCompletionContext(context: monaco.languages.InlineCompletionContext): CSharpLanguageServerInlineCompletionContext {
        const selectedSuggestion = context.selectedSuggestionInfo
            ? {
                range: this.toCSharpRange(context.selectedSuggestionInfo.range as monaco.Range),
                text: context.selectedSuggestionInfo.text,
                completionKind: context.selectedSuggestionInfo.completionKind,
                isSnippetText: context.selectedSuggestionInfo.isSnippetText
            }
            : undefined;
        return {
            triggerKind: context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit ? 'explicit' : 'automatic',
            ...(selectedSuggestion ? { selectedSuggestion } : {}),
            includeInlineCompletions: context.includeInlineCompletions,
            includeInlineEdits: context.includeInlineEdits
        };
    }

    protected toMonacoInlineCompletion(item: CSharpLanguageServerInlineCompletion, documentUri: string): monaco.languages.InlineCompletion {
        return {
            insertText: item.insertTextFormat === 'snippet' ? { snippet: item.insertText } : item.insertText,
            ...(item.range ? { range: this.symbolRange(item.range) } : {}),
            additionalTextEdits: item.additionalTextEdits.length ? this.toMonacoTextEdits(item.additionalTextEdits) : undefined,
            command: item.command ? this.toMonacoCommand(item.command, documentUri) : undefined,
            completeBracketPairs: item.completeBracketPairs
        };
    }

    protected toMonacoInlineValue(value: CSharpLanguageServerInlineValue): InlineValue {
        const range = this.symbolRange(value.range);
        switch (value.kind) {
            case 'text':
                return {
                    type: 'text',
                    range,
                    text: value.text ?? ''
                };
            case 'variable':
                return {
                    type: 'variable',
                    range,
                    ...(value.variableName ? { variableName: value.variableName } : {}),
                    caseSensitiveLookup: value.caseSensitiveLookup ?? false
                };
            case 'expression':
            default:
                return {
                    type: 'expression',
                    range,
                    ...(value.expression ? { expression: value.expression } : {})
                };
        }
    }

    protected toMonacoEvaluatableExpression(value: CSharpLanguageServerEvaluatableExpression): EvaluatableExpression {
        return {
            range: this.symbolRange(value.range),
            ...(value.expression ? { expression: value.expression } : {})
        };
    }

    protected toMonacoNewSymbolName(value: CSharpLanguageServerNewSymbolName): monaco.languages.NewSymbolName {
        const tags = value.tags?.includes('ai-generated')
            ? [monaco.languages.NewSymbolNameTag.AIGenerated]
            : undefined;
        return {
            newSymbolName: value.newSymbolName,
            ...(tags ? { tags } : {})
        };
    }

    protected selectionRange(symbol: Pick<CSharpWorkspaceSymbol, 'selectionLine' | 'selectionColumn' | 'selectionEndLine' | 'selectionEndColumn'>): monaco.Range {
        return new monaco.Range(symbol.selectionLine, symbol.selectionColumn, symbol.selectionEndLine, symbol.selectionEndColumn);
    }

    protected symbolMarkdown(symbol: CSharpWorkspaceSymbol): string {
        const scope = symbol.containerName ? `${symbol.containerName}.` : '';
        const signature = symbol.signature ? `\n\n\`${symbol.signature}\`` : '';
        return `**${symbol.kind} ${scope}${symbol.name}**\n\n${symbol.detail}${signature}\n\n\`${symbol.path}\``;
    }

    protected methodInvocationAt(model: monaco.editor.ITextModel, position: monaco.Position): { name: string; activeParameter: number } | undefined {
        const linePrefix = model.getValueInRange(new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column));
        const openParen = linePrefix.lastIndexOf('(');
        if (openParen < 0) {
            return undefined;
        }
        const nameMatch = /([A-Za-z_]\w*)\s*$/.exec(linePrefix.slice(0, openParen));
        if (!nameMatch) {
            return undefined;
        }
        const argumentPrefix = linePrefix.slice(openParen + 1);
        return {
            name: nameMatch[1],
            activeParameter: this.activeParameterIndex(argumentPrefix)
        };
    }

    protected activeParameterIndex(argumentPrefix: string): number {
        let depth = 0;
        let active = 0;
        for (const char of argumentPrefix) {
            if (char === '(' || char === '[' || char === '<') {
                depth++;
            } else if ((char === ')' || char === ']' || char === '>') && depth > 0) {
                depth--;
            } else if (char === ',' && depth === 0) {
                active++;
            }
        }
        return active;
    }

    protected signatureParameters(signature: string): monaco.languages.ParameterInformation[] {
        const match = /\((.*)\)/.exec(signature);
        if (!match || !match[1].trim()) {
            return [];
        }
        return match[1].split(',').map(parameter => ({
            label: parameter.trim()
        }));
    }

    protected normalizePath(value: string): string {
        return value.replace(/\\/g, '/').toLowerCase();
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }
}

const RAZOR_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.razor',
    csharpKeywords: [
        'abstract', 'as', 'async', 'await', 'base', 'break', 'case', 'catch', 'class', 'const', 'continue',
        'default', 'delegate', 'do', 'else', 'enum', 'event', 'false', 'finally', 'for', 'foreach', 'if',
        'in', 'interface', 'is', 'namespace', 'new', 'null', 'private', 'protected', 'public', 'readonly',
        'record', 'return', 'sealed', 'static', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
        'using', 'var', 'void', 'while'
    ],
    tokenizer: {
        root: [
            [/<!--/, 'comment', '@comment'],
            [/@(addTagHelper|attribute|code|functions|implements|inherits|inject|layout|model|namespace|page|removeTagHelper|section|typeparam|using)\b/, 'keyword'],
            [/@\{/, 'metatag', '@razorBlock'],
            [/@[A-Za-z_]\w*/, 'type.identifier'],
            [/<\/?/, 'delimiter.angle', '@tagName'],
            [/[^@<]+/, ''],
            [/[@<]/, '']
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
            [/@[A-Za-z_]\w*/, 'type.identifier'],
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
        ],
        razorBlock: [
            [/\}/, 'metatag', '@pop'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@blockComment'],
            [/"/, 'string', '@string'],
            [/[{}()[\]]/, 'delimiter'],
            [/[A-Za-z_]\w*/, {
                cases: {
                    '@csharpKeywords': 'keyword',
                    '@default': 'identifier'
                }
            }],
            [/[=+\-*/%<>!&|^~?:]+/, 'operator'],
            [/./, '']
        ],
        blockComment: [
            [/[^/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[/*]/, 'comment']
        ],
        string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
        ]
    }
};

const CSHARP_PROJECT_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.csharp-project',
    tokenizer: {
        root: [
            [/<!--/, 'comment', '@comment'],
            [/<\?[^?]*\?>/, 'metatag'],
            [/<\/?/, 'delimiter.angle', '@tagName'],
            [/[^<]+/, '']
        ],
        comment: [
            [/[^-]+/, 'comment'],
            [/-->/, 'comment', '@pop'],
            [/./, 'comment']
        ],
        tagName: [
            [/[A-Za-z_][\w:.-]*/, { token: 'tag', next: '@tag' }],
            [/\/?>/, 'delimiter.angle', '@pop'],
            [/\s+/, '']
        ],
        tag: [
            [/[A-Za-z_:][\w:.-]*/, 'attribute.name'],
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

const CSHARP_SOLUTION_MONARCH: monaco.languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.csharp-solution',
    tokenizer: {
        root: [
            [/<!--/, 'comment', '@comment'],
            [/<\?[^?]*\?>/, 'metatag'],
            [/<\/?/, 'delimiter.angle', '@tagName'],
            [/^\s*(Project|EndProject|Global|EndGlobal|GlobalSection|EndGlobalSection|ProjectSection|EndProjectSection)\b/, 'keyword'],
            [/\{[0-9A-Fa-f-]{36}\}/, 'constant'],
            [/".*?"/, 'string'],
            [/[A-Za-z0-9_.-]+(?=\s*=)/, 'attribute.name'],
            [/=/, 'operator'],
            [/#.*$/, 'comment'],
            [/./, '']
        ],
        comment: [
            [/[^-]+/, 'comment'],
            [/-->/, 'comment', '@pop'],
            [/./, 'comment']
        ],
        tagName: [
            [/[A-Za-z_][\w:.-]*/, { token: 'tag', next: '@tag' }],
            [/\/?>/, 'delimiter.angle', '@pop'],
            [/\s+/, '']
        ],
        tag: [
            [/[A-Za-z_:][\w:.-]*/, 'attribute.name'],
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

export const CSHARP_KIT_EXTENSION_ID = 'cybervinci.csharp-kit';
export const CSHARP_KIT_SERVICE_PATH = '/services/cybervinci/csharp-kit';

export const CSharpKitService = Symbol('CSharpKitService');

export type CSharpProjectKind = 'console' | 'web' | 'library' | 'test' | 'worker' | 'unknown';
export type CSharpCapabilityState = 'ready' | 'partial' | 'missing' | 'external';
export type CSharpProjectFileKind = 'csharp' | 'razor' | 'config' | 'resource' | 'proto' | 'other';
export type CSharpRoslynMode = 'semantic-ready' | 'build-required' | 'configured-missing' | 'not-installed';
export type CSharpRoslynSemanticMode = 'semantic' | 'parse-only' | 'structural-fallback' | 'unavailable';
export type CSharpIntelliSenseItemKind = 'namespace' | 'class' | 'interface' | 'record' | 'struct' | 'enum' | 'method' | 'property' | 'keyword' | 'snippet' | 'package';
export type CSharpDebugAdapterMode = 'ready' | 'configured-missing' | 'missing';
export type CSharpLanguageServerAdapterMode = 'ready' | 'configured-missing' | 'missing';
export type CSharpLanguageServerAdapterLanguage = 'csharp' | 'razor';
export type CSharpPackageVersionSource = 'project' | 'central';
export type CSharpPackageHealthIssueKind = 'vulnerable' | 'deprecated';
export type CSharpTestFramework = 'xUnit' | 'NUnit' | 'MSTest' | 'unknown';
export type CSharpDotnetTestRunner = 'VSTest' | 'Microsoft.Testing.Platform';
export type CSharpProjectTemplateId = 'console' | 'webapi' | 'mvc' | 'razor' | 'worker' | 'classlib' | 'xunit' | 'nunit' | 'mstest';
export type CSharpProjectItemTemplateId = 'class' | 'interface' | 'record' | 'enum' | 'controller' | 'razor-page' | 'xunit-test' | 'nunit-test' | 'mstest-test';
export type CSharpDiagnosticSeverity = 'error' | 'warning' | 'info';
export type CSharpWorkspaceSymbolKind =
    'namespace' | 'class' | 'interface' | 'record' | 'struct' | 'enum' | 'method' | 'property'
    | 'test-method' | 'aspnet-endpoint'
    | 'razor-page' | 'razor-model' | 'razor-inject' | 'razor-component' | 'razor-directive';
export type CSharpRazorFileKind = 'razor' | 'cshtml';
export type CSharpRazorDirectiveKind =
    'page' | 'model' | 'inherits' | 'inject' | 'using' | 'namespace' | 'layout'
    | 'addtaghelper' | 'removetaghelper' | 'taghelperprefix'
    | 'rendermode' | 'attribute' | 'implements' | 'typeparam' | 'code' | 'functions' | 'section' | 'unknown';

export interface CSharpWorkspaceRequest {
    workspacePath: string;
}

export interface CSharpProjectRequest extends CSharpWorkspaceRequest {
    projectPath: string;
}

export interface CSharpPackageCommandRequest extends CSharpProjectRequest {
    packageId: string;
    version?: string;
}

export interface CSharpNuGetSearchRequest extends CSharpWorkspaceRequest {
    query: string;
    prerelease?: boolean;
    take?: number;
}

export interface CSharpSolutionCommandRequest extends CSharpWorkspaceRequest {
    solutionPath: string;
    projectPath: string;
}

export interface CSharpCreateSolutionRequest extends CSharpWorkspaceRequest {
    solutionName: string;
    outputDirectory?: string;
}

export interface CSharpProjectReferenceCommandRequest extends CSharpProjectRequest {
    referenceProjectPath: string;
}

export interface CSharpWorkspaceFilesRequest extends CSharpProjectRequest {
    overwrite?: boolean;
}

export interface CSharpIntelliSenseRequest extends CSharpWorkspaceRequest {
    documentPath?: string;
}

export interface CSharpLanguageServerDocumentSymbolRequest extends CSharpWorkspaceRequest {
    documentPath: string;
    content: string;
    language?: CSharpLanguageServerAdapterLanguage;
}

export interface CSharpLanguageServerWorkspaceSymbolRequest extends CSharpWorkspaceRequest {
    query: string;
    language?: CSharpLanguageServerAdapterLanguage;
}

export interface CSharpLanguageServerWorkspaceSymbolResolveRequest extends CSharpWorkspaceRequest {
    symbol: CSharpLanguageServerWorkspaceSymbol;
    language?: CSharpLanguageServerAdapterLanguage;
}

export interface CSharpLanguageServerWorkspaceDiagnosticsRequest extends CSharpWorkspaceRequest {
    language?: CSharpLanguageServerAdapterLanguage;
}

export type CSharpLanguageServerSignatureHelpTriggerKind = 'invoked' | 'trigger-character' | 'content-change';

export interface CSharpLanguageServerSignatureHelpContext {
    triggerKind: CSharpLanguageServerSignatureHelpTriggerKind;
    triggerCharacter?: string;
    isRetrigger?: boolean;
}

export type CSharpLanguageServerCompletionTriggerKind = 'invoked' | 'trigger-character' | 'trigger-for-incomplete-completions';

export interface CSharpLanguageServerCompletionContext {
    triggerKind: CSharpLanguageServerCompletionTriggerKind;
    triggerCharacter?: string;
}

export interface CSharpLanguageServerTextDocumentPositionRequest extends CSharpLanguageServerDocumentSymbolRequest {
    line: number;
    column: number;
    includeDeclaration?: boolean;
    signatureHelpContext?: CSharpLanguageServerSignatureHelpContext;
    completionContext?: CSharpLanguageServerCompletionContext;
}

export interface CSharpLanguageServerCompletionItemResolveRequest extends CSharpLanguageServerDocumentSymbolRequest {
    item: CSharpIntelliSenseItem;
}

export interface CSharpLanguageServerExecuteCommandRequest extends CSharpLanguageServerDocumentSymbolRequest {
    command: string;
    arguments?: unknown[];
}

export interface CSharpLanguageServerSelectionRangeRequest extends CSharpLanguageServerDocumentSymbolRequest {
    positions: Array<{
        line: number;
        column: number;
    }>;
}

export interface CSharpLanguageServerRenameRequest extends CSharpLanguageServerTextDocumentPositionRequest {
    newName: string;
}

export type CSharpLanguageServerNewSymbolNameTriggerKind = 'invoke' | 'automatic';

export interface CSharpLanguageServerNewSymbolNamesRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
    triggerKind: CSharpLanguageServerNewSymbolNameTriggerKind;
}

export interface CSharpLanguageServerFormattingOptions {
    tabSize?: number;
    insertSpaces?: boolean;
}

export interface CSharpLanguageServerFormattingRequest extends CSharpLanguageServerDocumentSymbolRequest {
    options?: CSharpLanguageServerFormattingOptions;
}

export interface CSharpLanguageServerRangeFormattingRequest extends CSharpLanguageServerFormattingRequest {
    range: CSharpWorkspaceSymbolRange;
}

export interface CSharpLanguageServerRangesFormattingRequest extends CSharpLanguageServerFormattingRequest {
    ranges: CSharpWorkspaceSymbolRange[];
}

export interface CSharpLanguageServerOnTypeFormattingRequest extends CSharpLanguageServerFormattingRequest {
    line: number;
    column: number;
    ch: string;
}

export interface CSharpLanguageServerRangeSemanticTokensRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
}

export interface CSharpLanguageServerSemanticTokensRequest extends CSharpLanguageServerDocumentSymbolRequest {
    previousResultId?: string;
}

export interface CSharpLanguageServerInlineValueContext {
    frameId: number;
    stoppedLocation: CSharpWorkspaceSymbolRange;
}

export interface CSharpLanguageServerInlineValueRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
    context: CSharpLanguageServerInlineValueContext;
}

export interface CSharpLanguageServerEvaluatableExpression {
    range: CSharpWorkspaceSymbolRange;
    expression?: string;
}

export type CSharpLanguageServerInlineCompletionTriggerKind = 'automatic' | 'explicit';

export interface CSharpLanguageServerInlineCompletionSelectedSuggestion {
    range: CSharpWorkspaceSymbolRange;
    text: string;
    completionKind?: number;
    isSnippetText?: boolean;
}

export interface CSharpLanguageServerInlineCompletionContext {
    triggerKind: CSharpLanguageServerInlineCompletionTriggerKind;
    selectedSuggestion?: CSharpLanguageServerInlineCompletionSelectedSuggestion;
    includeInlineCompletions?: boolean;
    includeInlineEdits?: boolean;
}

export interface CSharpLanguageServerInlineCompletionRequest extends CSharpLanguageServerTextDocumentPositionRequest {
    inlineCompletionContext?: CSharpLanguageServerInlineCompletionContext;
}

export interface CSharpLanguageServerCallHierarchyItem {
    name: string;
    kind: number;
    uri: string;
    range: CSharpWorkspaceSymbolRange;
    selectionRange: CSharpWorkspaceSymbolRange;
    detail?: string;
    tags?: number[];
    data?: unknown;
}

export interface CSharpLanguageServerCallHierarchyItemRequest extends CSharpWorkspaceRequest {
    item: CSharpLanguageServerCallHierarchyItem;
    language?: CSharpLanguageServerAdapterLanguage;
}

export interface CSharpLanguageServerTypeHierarchyItem {
    name: string;
    kind: number;
    uri: string;
    range: CSharpWorkspaceSymbolRange;
    selectionRange: CSharpWorkspaceSymbolRange;
    detail?: string;
    tags?: number[];
    data?: unknown;
}

export interface CSharpLanguageServerTypeHierarchyItemRequest extends CSharpWorkspaceRequest {
    item: CSharpLanguageServerTypeHierarchyItem;
    language?: CSharpLanguageServerAdapterLanguage;
}

export interface CSharpLanguageServerInlayHintRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
}

export interface CSharpLanguageServerInlayHintResolveRequest extends CSharpLanguageServerDocumentSymbolRequest {
    hint: CSharpLanguageServerInlayHint;
}

export interface CSharpLanguageServerColorPresentationRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
    color: CSharpLanguageServerColor;
}

export interface CSharpLanguageServerDiagnostic {
    range: CSharpWorkspaceSymbolRange;
    severity?: number;
    code?: string | number;
    source?: string;
    message: string;
}

export type CSharpLanguageServerCodeActionTriggerKind = 'invoke' | 'auto';

export interface CSharpLanguageServerCodeActionRequest extends CSharpLanguageServerDocumentSymbolRequest {
    range: CSharpWorkspaceSymbolRange;
    diagnostics?: CSharpLanguageServerDiagnostic[];
    only?: string;
    triggerKind?: CSharpLanguageServerCodeActionTriggerKind;
}

export interface CSharpLanguageServerCodeActionResolveRequest extends CSharpLanguageServerDocumentSymbolRequest {
    action: CSharpLanguageServerCodeAction;
}

export interface CSharpLanguageServerCodeLensResolveRequest extends CSharpLanguageServerDocumentSymbolRequest {
    lens: CSharpLanguageServerCodeLens;
}

export interface CSharpDiagnosticRequest extends CSharpWorkspaceRequest {
    projectPath?: string;
    noRestore?: boolean;
}

export interface CSharpProjectTemplate {
    id: CSharpProjectTemplateId;
    label: string;
    dotnetTemplate: string;
    description: string;
    kind: CSharpProjectKind;
}

export interface CSharpProjectItemTemplate {
    id: CSharpProjectItemTemplateId;
    label: string;
    description: string;
    defaultDirectory: string;
}

export interface CSharpCreateProjectRequest extends CSharpWorkspaceRequest {
    templateId: CSharpProjectTemplateId;
    projectName: string;
    outputDirectory?: string;
    framework?: string;
    solutionPath?: string;
    createSolution?: boolean;
    solutionName?: string;
}

export interface CSharpCreateProjectItemRequest extends CSharpProjectRequest {
    templateId: CSharpProjectItemTemplateId;
    itemName: string;
    outputDirectory?: string;
    namespace?: string;
    overwrite?: boolean;
}

export interface CSharpCommandResult {
    ok: boolean;
    command: string;
    cwd: string;
    exitCode?: number;
    stdout: string;
    stderr: string;
    durationMs: number;
}

export interface CSharpDiagnostic {
    path: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    severity: CSharpDiagnosticSeverity;
    code?: string;
    message: string;
    projectPath?: string;
}

export interface CSharpDotnetInfo {
    available: boolean;
    executable: string;
    version?: string;
    sdks: string[];
    runtimes: string[];
    error?: string;
}

export interface CSharpGlobalJsonSummary {
    path: string;
    relativePath: string;
    sdkVersion?: string;
    rollForward?: string;
    allowPrerelease?: boolean;
    paths: string[];
    testRunner?: string;
    sdkInstalled?: boolean;
    error?: string;
}

export interface CSharpEditorConfigProperty {
    key: string;
    value: string;
}

export interface CSharpEditorConfigSection {
    pattern: string;
    properties: CSharpEditorConfigProperty[];
}

export interface CSharpEditorConfigSummary {
    path: string;
    relativePath: string;
    kind: 'editorconfig' | 'globalconfig';
    root?: boolean;
    isGlobal?: boolean;
    globalLevel?: string;
    sections: CSharpEditorConfigSection[];
    csharpPropertyCount: number;
    dotnetPropertyCount: number;
    analyzerRuleCount: number;
}

export interface CSharpDotnetLocalTool {
    packageId: string;
    version?: string;
    commands: string[];
    rollForward?: boolean;
}

export interface CSharpDotnetToolManifestSummary {
    path: string;
    relativePath: string;
    isRoot?: boolean;
    tools: CSharpDotnetLocalTool[];
}

export interface CSharpRunSettingsProperty {
    name: string;
    value: string;
}

export interface CSharpRunSettingsSummary {
    path: string;
    relativePath: string;
    name: string;
    runConfiguration: CSharpRunSettingsProperty[];
    dataCollectors: string[];
    testRunParameters: CSharpRunSettingsProperty[];
    mstestSettings: CSharpRunSettingsProperty[];
}

export interface CSharpSolutionSummary {
    path: string;
    name: string;
    format: 'sln' | 'slnx' | 'slnf';
    sourceSolutionPath?: string;
    sourceSolutionName?: string;
    projectPaths: string[];
}

export interface CSharpPackageReference {
    id: string;
    version?: string;
    privateAssets?: string;
    includeAssets?: string;
    versionSource?: CSharpPackageVersionSource;
    versionPath?: string;
    transitive?: boolean;
}

export interface CSharpCentralPackageVersion {
    id: string;
    version: string;
    path?: string;
}

export interface CSharpNuGetSearchPackage {
    id: string;
    version: string;
    description?: string;
    authors?: string[];
    totalDownloads?: number;
    verified?: boolean;
    projectUrl?: string;
    iconUrl?: string;
    source: string;
}

export interface CSharpPackageUpdate {
    id: string;
    requestedVersion?: string;
    resolvedVersion?: string;
    latestVersion?: string;
    framework?: string;
    projectPath?: string;
    transitive?: boolean;
}

export interface CSharpPackageHealthIssue {
    id: string;
    kind: CSharpPackageHealthIssueKind;
    requestedVersion?: string;
    resolvedVersion?: string;
    framework?: string;
    projectPath?: string;
    transitive?: boolean;
    severity?: string;
    advisoryUrl?: string;
    advisoryUrls?: string[];
    deprecationReasons?: string[];
    alternativePackageId?: string;
    alternativePackageVersion?: string;
    message?: string;
}

export interface CSharpNuGetPackageSource {
    key: string;
    value: string;
    protocolVersion?: string;
    disabled?: boolean;
}

export interface CSharpNuGetPackageSourceMapping {
    sourceKey: string;
    patterns: string[];
}

export interface CSharpNuGetConfigSummary {
    path: string;
    relativePath: string;
    clearPackageSources: boolean;
    packageSources: CSharpNuGetPackageSource[];
    disabledPackageSources: string[];
    packageSourceMappings: CSharpNuGetPackageSourceMapping[];
}

export interface CSharpProjectReference {
    path: string;
}

export interface CSharpProjectFile {
    path: string;
    relativePath: string;
    kind: CSharpProjectFileKind;
}

export type CSharpMsBuildFileKind = 'props' | 'targets';

export interface CSharpMsBuildProperty {
    name: string;
    value: string;
    condition?: string;
}

export interface CSharpMsBuildFileSummary {
    path: string;
    relativePath: string;
    kind: CSharpMsBuildFileKind;
    properties: CSharpMsBuildProperty[];
}

export interface CSharpRazorInjection {
    type: string;
    name: string;
    line: number;
}

export interface CSharpRazorDirective {
    kind: CSharpRazorDirectiveKind;
    value: string;
    line: number;
    column: number;
    name?: string;
    type?: string;
}

export interface CSharpRazorImportSummary {
    path: string;
    relativePath: string;
    namespace?: string;
    layout?: string;
    usings: string[];
    injections: CSharpRazorInjection[];
    tagHelpers: string[];
    removeTagHelpers: string[];
    tagHelperPrefix?: string;
}

export interface CSharpRazorFileSummary {
    path: string;
    relativePath: string;
    kind: CSharpRazorFileKind;
    routeTemplates: string[];
    model?: string;
    namespace?: string;
    inherits?: string;
    layout?: string;
    usings: string[];
    injections: CSharpRazorInjection[];
    directives: CSharpRazorDirective[];
    tagHelpers: string[];
    removeTagHelpers: string[];
    tagHelperPrefix?: string;
    importedFiles: CSharpRazorImportSummary[];
    effectiveNamespace?: string;
    effectiveLayout?: string;
    effectiveUsings: string[];
    effectiveInjections: CSharpRazorInjection[];
    effectiveTagHelpers: string[];
    effectiveTagHelperPrefix?: string;
    componentTags: string[];
}

export interface CSharpLaunchProfile {
    name: string;
    commandName?: string;
    applicationUrl?: string;
    applicationUrls?: string[];
    launchUrl?: string;
    launchBrowser?: boolean;
    commandLineArgs?: string;
    workingDirectory?: string;
    executablePath?: string;
    browserUrl?: string;
    sslPort?: number;
    dotnetRunMessages?: boolean;
    nativeDebugging?: boolean;
    hotReloadEnabled?: boolean;
    externalUrlConfiguration?: boolean;
    inspectUri?: string;
    environmentVariables: Record<string, string>;
}

export interface CSharpPublishProfile {
    path: string;
    relativePath: string;
    name: string;
    publishProtocol?: string;
    publishUrl?: string;
    publishDir?: string;
    targetFramework?: string;
    runtimeIdentifier?: string;
    lastUsedBuildConfiguration?: string;
    lastUsedPlatform?: string;
    webPublishMethod?: string;
    selfContained?: string;
}

export interface CSharpProjectSummary {
    path: string;
    directory: string;
    name: string;
    assemblyName: string;
    sdk?: string;
    kind: CSharpProjectKind;
    targetFrameworks: string[];
    outputType?: string;
    nullable?: string;
    implicitUsings?: string;
    userSecretsId?: string;
    centralPackageVersionPath?: string;
    centralPackageVersions?: CSharpCentralPackageVersion[];
    packageReferences: CSharpPackageReference[];
    projectReferences: CSharpProjectReference[];
    msBuildFiles: CSharpMsBuildFileSummary[];
    files: CSharpProjectFile[];
    razorFiles: CSharpRazorFileSummary[];
    launchProfiles: CSharpLaunchProfile[];
    publishProfiles: CSharpPublishProfile[];
    isAspNetCore: boolean;
    isTestProject: boolean;
    testFramework?: CSharpTestFramework;
    testRunner?: CSharpDotnetTestRunner;
}

export interface CSharpTestCase {
    id: string;
    name: string;
    fullyQualifiedName: string;
    displayName: string;
    projectPath: string;
    framework?: string;
    namespaceName?: string;
    className?: string;
    methodName?: string;
    arguments?: string;
    testFramework?: CSharpTestFramework;
}

export interface CSharpCapability {
    id: string;
    label: string;
    state: CSharpCapabilityState;
    source: string;
    detail: string;
}

export type CSharpKitWorkspaceConfigState = 'absent' | 'valid' | 'invalid';

export interface CSharpKitWorkspaceConfigStatus {
    path: string;
    relativePath: string;
    state: CSharpKitWorkspaceConfigState;
    exists: boolean;
    valid: boolean;
    error?: string;
    configuredRoslyn: boolean;
    configuredDebugAdapters: string[];
    configuredLanguageServers: CSharpLanguageServerAdapterLanguage[];
}

export interface CSharpRoslynStatus {
    mode: CSharpRoslynMode;
    detail: string;
    analyzerPath?: string;
    sidecarProjectPath?: string;
    buildCommand?: string;
    timeoutMs?: number;
}

export interface CSharpSemanticDiagnostic {
    id: string;
    severity: string;
    message: string;
    path?: string;
    detail?: string;
}

export interface CSharpSemanticSymbol {
    id: string;
    name: string;
    kind: string;
    fileId: string;
    path?: string;
    fullName?: string;
    parentSymbolId?: string;
    signature?: string;
    startLine?: number;
    endLine?: number;
    returnType?: string;
    detail: string;
    metadata?: Record<string, unknown>;
}

export interface CSharpSemanticRelation {
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
    confidenceScore: number;
    evidence?: string;
}

export interface CSharpSemanticHint {
    sourceSymbolId: string;
    targetName: string;
    targetSymbolId?: string;
    targetSemanticFullName?: string;
    evidence?: string;
}

export interface CSharpSemanticInventorySummary {
    symbolCount: number;
    relationCount: number;
    endpointCount: number;
    testMethodCount: number;
    dbContextCount: number;
    dependencyHintCount: number;
    callHintCount: number;
}

export interface CSharpSemanticInventoryResult {
    workspacePath: string;
    mode: CSharpRoslynSemanticMode;
    detail: string;
    analyzedFiles: number;
    analyzerIds: string[];
    symbols: CSharpSemanticSymbol[];
    relations: CSharpSemanticRelation[];
    diagnostics: CSharpSemanticDiagnostic[];
    callHints: CSharpSemanticHint[];
    dependencyHints: CSharpSemanticHint[];
    summary: CSharpSemanticInventorySummary;
}

export interface CSharpDebugAdapterStatus {
    mode: CSharpDebugAdapterMode;
    adapter: 'netcoredbg' | 'vsdbg' | 'coreclr-dap';
    detail: string;
    command?: string;
    args: string[];
    envVar: string;
    setupHint: string;
}

export interface CSharpLanguageServerAdapterStatus {
    id: string;
    label: string;
    language: CSharpLanguageServerAdapterLanguage;
    mode: CSharpLanguageServerAdapterMode;
    command?: string;
    args: string[];
    probeTimeoutMs: number;
    envVar: string;
    source: string;
    setupHint: string;
    detail: string;
}

export interface CSharpLanguageServerProbe {
    id: string;
    label: string;
    language: CSharpLanguageServerAdapterLanguage;
    ok: boolean;
    mode: 'initialized' | 'failed' | 'missing' | 'configured-missing';
    command?: string;
    args: string[];
    probeTimeoutMs: number;
    durationMs: number;
    serverName?: string;
    serverVersion?: string;
    capabilityKeys: string[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerProbeResult {
    workspacePath: string;
    probes: CSharpLanguageServerProbe[];
}

export interface CSharpLanguageServerDocumentSymbol {
    name: string;
    detail?: string;
    kind: CSharpWorkspaceSymbolKind;
    range: CSharpWorkspaceSymbolRange;
    selectionRange: CSharpWorkspaceSymbolRange;
    children: CSharpLanguageServerDocumentSymbol[];
}

export interface CSharpLanguageServerDocumentSymbolResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    symbols: CSharpLanguageServerDocumentSymbol[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerDocumentLink {
    range: CSharpWorkspaceSymbolRange;
    target?: string;
    tooltip?: string;
    data?: unknown;
}

export interface CSharpLanguageServerDocumentLinkResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    links: CSharpLanguageServerDocumentLink[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerDocumentLinkResolveRequest extends CSharpLanguageServerDocumentSymbolRequest {
    link: CSharpLanguageServerDocumentLink;
}

export interface CSharpLanguageServerDocumentLinkResolveResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    link?: CSharpLanguageServerDocumentLink;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerColor {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

export interface CSharpLanguageServerDocumentColor {
    range: CSharpWorkspaceSymbolRange;
    color: CSharpLanguageServerColor;
}

export interface CSharpLanguageServerDocumentColorResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    colors: CSharpLanguageServerDocumentColor[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerLinkedEditingRangeResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    ranges: CSharpWorkspaceSymbolRange[];
    wordPattern?: string;
    detail: string;
    stderr?: string;
}

export type CSharpLanguageServerMonikerKind = 'import' | 'export' | 'local';
export type CSharpLanguageServerMonikerUniquenessLevel = 'document' | 'project' | 'group' | 'scheme' | 'global';

export interface CSharpLanguageServerMoniker {
    scheme: string;
    identifier: string;
    unique: CSharpLanguageServerMonikerUniquenessLevel;
    kind?: CSharpLanguageServerMonikerKind;
}

export interface CSharpLanguageServerMonikerResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    monikers: CSharpLanguageServerMoniker[];
    detail: string;
    stderr?: string;
}

export type CSharpLanguageServerInlineValueKind = 'text' | 'variable' | 'expression';

export interface CSharpLanguageServerInlineValue {
    kind: CSharpLanguageServerInlineValueKind;
    range: CSharpWorkspaceSymbolRange;
    text?: string;
    variableName?: string;
    caseSensitiveLookup?: boolean;
    expression?: string;
}

export interface CSharpLanguageServerInlineValueResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    inlineValues: CSharpLanguageServerInlineValue[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerEvaluatableExpressionResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    expression?: CSharpLanguageServerEvaluatableExpression;
    detail: string;
    stderr?: string;
}

export const CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_TYPES = [
    'namespace',
    'type',
    'class',
    'enum',
    'interface',
    'struct',
    'typeParameter',
    'parameter',
    'variable',
    'property',
    'enumMember',
    'event',
    'function',
    'method',
    'macro',
    'keyword',
    'modifier',
    'comment',
    'string',
    'number',
    'regexp',
    'operator',
    'decorator'
] as const;

export const CSHARP_LANGUAGE_SERVER_SEMANTIC_TOKEN_MODIFIERS = [
    'declaration',
    'definition',
    'readonly',
    'static',
    'deprecated',
    'abstract',
    'async',
    'modification',
    'documentation',
    'defaultLibrary'
] as const;

export interface CSharpLanguageServerSemanticTokensResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    resultId?: string;
    data: number[];
    edits?: CSharpLanguageServerSemanticTokensEdit[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerSemanticTokensEdit {
    start: number;
    deleteCount: number;
    data?: number[];
}

export interface CSharpLanguageServerCallHierarchyPrepareResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    items: CSharpLanguageServerCallHierarchyItem[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCallHierarchyIncomingCall {
    from: CSharpLanguageServerCallHierarchyItem;
    fromRanges: CSharpWorkspaceSymbolRange[];
}

export interface CSharpLanguageServerCallHierarchyOutgoingCall {
    to: CSharpLanguageServerCallHierarchyItem;
    fromRanges: CSharpWorkspaceSymbolRange[];
}

export interface CSharpLanguageServerCallHierarchyIncomingResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    calls: CSharpLanguageServerCallHierarchyIncomingCall[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCallHierarchyOutgoingResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    calls: CSharpLanguageServerCallHierarchyOutgoingCall[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerTypeHierarchyPrepareResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    items: CSharpLanguageServerTypeHierarchyItem[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerTypeHierarchyResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    items: CSharpLanguageServerTypeHierarchyItem[];
    detail: string;
    stderr?: string;
}

export type CSharpLanguageServerFoldingRangeKind = 'comment' | 'imports' | 'region';

export interface CSharpLanguageServerFoldingRange {
    startLine: number;
    endLine: number;
    kind?: CSharpLanguageServerFoldingRangeKind;
}

export interface CSharpLanguageServerFoldingRangeResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    ranges: CSharpLanguageServerFoldingRange[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerSelectionRangeResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    ranges: CSharpWorkspaceSymbolRange[][];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerHoverResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    contents: string[];
    range?: CSharpWorkspaceSymbolRange;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerDefinitionLocation {
    uri: string;
    range: CSharpWorkspaceSymbolRange;
}

export interface CSharpLanguageServerDefinitionResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    locations: CSharpLanguageServerDefinitionLocation[];
    detail: string;
    stderr?: string;
}

export type CSharpLanguageServerDocumentHighlightKind = 'text' | 'read' | 'write';

export interface CSharpLanguageServerDocumentHighlight {
    range: CSharpWorkspaceSymbolRange;
    kind: CSharpLanguageServerDocumentHighlightKind;
}

export interface CSharpLanguageServerDocumentHighlightResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    highlights: CSharpLanguageServerDocumentHighlight[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerWorkspaceSymbol {
    name: string;
    kind: number;
    uri: string;
    range: CSharpWorkspaceSymbolRange;
    containerName?: string;
    tags?: number[];
    data?: unknown;
}

export interface CSharpLanguageServerWorkspaceSymbolResult {
    workspacePath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    symbols: CSharpLanguageServerWorkspaceSymbol[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerWorkspaceSymbolResolveResult {
    workspacePath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    symbol?: CSharpLanguageServerWorkspaceSymbol;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCommand {
    title: string;
    command: string;
    arguments?: unknown[];
}

export interface CSharpLanguageServerCodeLens {
    range: CSharpWorkspaceSymbolRange;
    command?: CSharpLanguageServerCommand;
    data?: unknown;
}

export interface CSharpLanguageServerCodeLensResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    lenses: CSharpLanguageServerCodeLens[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCodeLensResolveResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    lens?: CSharpLanguageServerCodeLens;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerReferencesResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    locations: CSharpLanguageServerDefinitionLocation[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerTextEdit {
    uri: string;
    range: CSharpWorkspaceSymbolRange;
    newText: string;
}

export interface CSharpLanguageServerWorkspaceEditResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    edits: CSharpLanguageServerTextEdit[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerPrepareRenameResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    range?: CSharpWorkspaceSymbolRange;
    placeholder?: string;
    defaultBehavior?: boolean;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerNewSymbolName {
    newSymbolName: string;
    tags?: Array<'ai-generated'>;
}

export interface CSharpLanguageServerNewSymbolNamesResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    names: CSharpLanguageServerNewSymbolName[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerTextEditResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    edits: CSharpLanguageServerTextEdit[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerColorPresentation {
    label: string;
    textEdit?: CSharpLanguageServerTextEdit;
    additionalTextEdits: CSharpLanguageServerTextEdit[];
}

export interface CSharpLanguageServerColorPresentationResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    presentations: CSharpLanguageServerColorPresentation[];
    detail: string;
    stderr?: string;
}

export type CSharpLanguageServerInlayHintKind = 'type' | 'parameter';

export interface CSharpLanguageServerInlayHint {
    label: string;
    position: {
        line: number;
        column: number;
    };
    kind?: CSharpLanguageServerInlayHintKind;
    tooltip?: string;
    textEdits: CSharpLanguageServerTextEdit[];
    paddingLeft?: boolean;
    paddingRight?: boolean;
    data?: unknown;
}

export interface CSharpLanguageServerInlayHintResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    hints: CSharpLanguageServerInlayHint[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerInlayHintResolveResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    hint?: CSharpLanguageServerInlayHint;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCodeAction {
    title: string;
    kind?: string;
    isPreferred?: boolean;
    disabled?: string;
    edits: CSharpLanguageServerTextEdit[];
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    data?: unknown;
}

export interface CSharpLanguageServerCodeActionResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    actions: CSharpLanguageServerCodeAction[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCodeActionResolveResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    action?: CSharpLanguageServerCodeAction;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerDiagnosticsResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    diagnostics: CSharpDiagnostic[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerWorkspaceDiagnosticsResult {
    workspacePath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    diagnostics: CSharpDiagnostic[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCompletionResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    items: CSharpIntelliSenseItem[];
    isIncomplete?: boolean;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerCompletionItemResolveResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    item?: CSharpIntelliSenseItem;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerInlineCompletion {
    insertText: string;
    insertTextFormat?: 'plain' | 'snippet';
    filterText?: string;
    range?: CSharpWorkspaceSymbolRange;
    additionalTextEdits: CSharpLanguageServerTextEdit[];
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    completeBracketPairs?: boolean;
}

export interface CSharpLanguageServerInlineCompletionResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    items: CSharpLanguageServerInlineCompletion[];
    suppressSuggestions?: boolean;
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerExecuteCommandResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    result?: unknown;
    edits: CSharpLanguageServerTextEdit[];
    detail: string;
    stderr?: string;
}

export interface CSharpLanguageServerSignatureInformation {
    label: string;
    documentation?: string;
    parameters: string[];
}

export interface CSharpLanguageServerSignatureHelpResult {
    workspacePath: string;
    documentPath: string;
    source: 'language-server' | 'unavailable';
    adapterId?: string;
    adapterLabel?: string;
    durationMs: number;
    signatures: CSharpLanguageServerSignatureInformation[];
    activeSignature: number;
    activeParameter: number;
    detail: string;
    stderr?: string;
}

export interface CSharpIntelliSenseItem {
    label: string;
    insertText: string;
    kind: CSharpIntelliSenseItemKind;
    detail: string;
    documentation?: string;
    signature?: string;
    returnType?: string;
    sourcePath?: string;
    lspKind?: number;
    sortText?: string;
    filterText?: string;
    preselect?: boolean;
    textEdit?: CSharpLanguageServerTextEdit;
    commitCharacters?: string[];
    insertTextFormat?: number;
    additionalTextEdits?: CSharpLanguageServerTextEdit[];
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
    data?: unknown;
}

export interface CSharpIntelliSenseResult {
    workspacePath: string;
    source: 'workspace-index' | 'workspace-index-and-roslyn-ready';
    items: CSharpIntelliSenseItem[];
}

export interface CSharpDiagnosticsResult {
    workspacePath: string;
    projectPath?: string;
    diagnostics: CSharpDiagnostic[];
    rawOutput: string;
    commandResult: CSharpCommandResult;
}

export interface CSharpWorkspaceSymbolRange {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
}

export interface CSharpWorkspaceSymbol extends CSharpWorkspaceSymbolRange {
    id: string;
    name: string;
    kind: CSharpWorkspaceSymbolKind;
    path: string;
    selectionLine: number;
    selectionColumn: number;
    selectionEndLine: number;
    selectionEndColumn: number;
    containerName?: string;
    signature?: string;
    returnType?: string;
    detail: string;
}

export interface CSharpWorkspaceSymbolResult {
    workspacePath: string;
    symbols: CSharpWorkspaceSymbol[];
}

export type CSharpCodeContextSuggestionKind =
    'ai-context' | 'architecture' | 'test' | 'endpoint' | 'dependency' | 'package' | 'configuration';

export interface CSharpCodeContextSignal {
    label: string;
    value: string;
    detail?: string;
}

export interface CSharpCodeContextSuggestion {
    id: string;
    kind: CSharpCodeContextSuggestionKind;
    title: string;
    detail: string;
    evidence: string[];
}

export interface CSharpCodeContextSection {
    id: string;
    label: string;
    items: string[];
}

export interface CSharpCodeContextRequest extends CSharpWorkspaceRequest {
    solutionPath?: string;
    projectPath?: string;
    documentPath?: string;
}

export interface CSharpCodeContextResult {
    workspacePath: string;
    solutionPath?: string;
    projectPath?: string;
    documentPath?: string;
    summary: string;
    signals: CSharpCodeContextSignal[];
    suggestions: CSharpCodeContextSuggestion[];
    sections: CSharpCodeContextSection[];
    prompt: string;
    semanticMode: CSharpRoslynSemanticMode;
    symbolCount: number;
}

export interface CSharpMicrosoftExtensionMapping {
    microsoftExtensionId: string;
    microsoftName: string;
    cyberVinciComponent: string;
    capability: string;
    replacementMode: 'implemented' | 'adapter-boundary' | 'external-runtime';
    notes: string;
}

export interface CSharpWorkspaceInspection {
    workspacePath: string;
    csharpKitConfig: CSharpKitWorkspaceConfigStatus;
    dotnet: CSharpDotnetInfo;
    roslyn: CSharpRoslynStatus;
    debugAdapter: CSharpDebugAdapterStatus;
    languageServers: CSharpLanguageServerAdapterStatus[];
    solutions: CSharpSolutionSummary[];
    projects: CSharpProjectSummary[];
    globalJsons: CSharpGlobalJsonSummary[];
    editorConfigs: CSharpEditorConfigSummary[];
    globalConfigs: CSharpEditorConfigSummary[];
    toolManifests: CSharpDotnetToolManifestSummary[];
    runSettings: CSharpRunSettingsSummary[];
    nugetConfigs: CSharpNuGetConfigSummary[];
    capabilities: CSharpCapability[];
    microsoftMappings: CSharpMicrosoftExtensionMapping[];
    recommendations: string[];
}

export interface CSharpWorkspaceFilesResult {
    launchJsonPath: string;
    tasksJsonPath: string;
    csharpKitConfigPath: string;
    launchConfigurationName: string;
    launchConfigurationNames: string[];
    taskLabels: string[];
    configChanged: boolean;
    changed: boolean;
}

export interface CSharpWorkspaceConfigFileResult {
    configPath: string;
    changed: boolean;
}

export interface CSharpCreateProjectResult {
    ok: boolean;
    projectPath: string;
    projectDirectory: string;
    solutionPath?: string;
    addedToSolution: boolean;
    commandResults: CSharpCommandResult[];
    rawOutput: string;
}

export interface CSharpCreateProjectItemResult {
    ok: boolean;
    projectPath: string;
    createdFiles: string[];
    skippedFiles: string[];
    changed: boolean;
    rawOutput: string;
}

export interface CSharpCreateSolutionResult {
    ok: boolean;
    solutionPath: string;
    commandResult: CSharpCommandResult;
}

export interface CSharpPackageListResult {
    projectPath: string;
    packages: CSharpPackageReference[];
    rawOutput: string;
}

export interface CSharpNuGetSearchResult {
    query: string;
    source: string;
    packages: CSharpNuGetSearchPackage[];
    rawOutput: string;
}

export interface CSharpPackageUpdateResult {
    projectPath: string;
    updates: CSharpPackageUpdate[];
    rawOutput: string;
}

export interface CSharpPackageHealthResult {
    projectPath: string;
    issues: CSharpPackageHealthIssue[];
    rawOutput: string;
}

export interface CSharpTestDiscoveryResult {
    projectPath: string;
    tests: CSharpTestCase[];
    rawOutput: string;
}

export type CSharpTestOutcome = 'passed' | 'failed' | 'skipped' | 'errored';

export interface CSharpTestRunRequest extends CSharpProjectRequest {
    testNames?: string[];
    noRestore?: boolean;
    debug?: boolean;
}

export interface CSharpTestDebugSessionRequest extends CSharpProjectRequest {
    testName?: string;
    noRestore?: boolean;
}

export interface CSharpTestDebugSession {
    projectPath: string;
    resultsDirectory: string;
    cwd: string;
    args: string[];
}

export interface CSharpTestResult {
    name: string;
    projectPath: string;
    outcome: CSharpTestOutcome;
    stdout: string;
    stderr: string;
    exitCode?: number;
    durationMs: number;
}

export interface CSharpTestRunResult {
    projectPath: string;
    ok: boolean;
    results: CSharpTestResult[];
    rawOutput: string;
}

export interface CSharpTestResultCaptureRequest extends CSharpProjectRequest {
    resultsDirectory: string;
    deleteResultsDirectory?: boolean;
}

export interface CSharpKitService {
    inspectWorkspace(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceInspection>;
    getProjectTemplates(): Promise<CSharpProjectTemplate[]>;
    createProject(request: CSharpCreateProjectRequest): Promise<CSharpCreateProjectResult>;
    getProjectItemTemplates(): Promise<CSharpProjectItemTemplate[]>;
    createProjectItem(request: CSharpCreateProjectItemRequest): Promise<CSharpCreateProjectItemResult>;
    createSolution(request: CSharpCreateSolutionRequest): Promise<CSharpCreateSolutionResult>;
    addProjectToSolution(request: CSharpSolutionCommandRequest): Promise<CSharpCommandResult>;
    removeProjectFromSolution(request: CSharpSolutionCommandRequest): Promise<CSharpCommandResult>;
    addProjectReference(request: CSharpProjectReferenceCommandRequest): Promise<CSharpCommandResult>;
    removeProjectReference(request: CSharpProjectReferenceCommandRequest): Promise<CSharpCommandResult>;
    writeWorkspaceFiles(request: CSharpWorkspaceFilesRequest): Promise<CSharpWorkspaceFilesResult>;
    writeWorkspaceConfig(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceConfigFileResult>;
    listPackages(request: CSharpProjectRequest): Promise<CSharpPackageListResult>;
    listPackageUpdates(request: CSharpProjectRequest): Promise<CSharpPackageUpdateResult>;
    listPackageHealth(request: CSharpProjectRequest): Promise<CSharpPackageHealthResult>;
    searchPackages(request: CSharpNuGetSearchRequest): Promise<CSharpNuGetSearchResult>;
    addPackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult>;
    updatePackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult>;
    removePackage(request: CSharpPackageCommandRequest): Promise<CSharpCommandResult>;
    discoverTests(request: CSharpProjectRequest): Promise<CSharpTestDiscoveryResult>;
    runTests(request: CSharpTestRunRequest): Promise<CSharpTestRunResult>;
    prepareTestDebugSession(request: CSharpTestDebugSessionRequest): Promise<CSharpTestDebugSession>;
    collectTestResults(request: CSharpTestResultCaptureRequest): Promise<CSharpTestRunResult>;
    getIntelliSense(request: CSharpIntelliSenseRequest): Promise<CSharpIntelliSenseResult>;
    getDiagnostics(request: CSharpDiagnosticRequest): Promise<CSharpDiagnosticsResult>;
    getLanguageServerDiagnostics(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDiagnosticsResult>;
    getLanguageServerWorkspaceDiagnostics(request: CSharpLanguageServerWorkspaceDiagnosticsRequest): Promise<CSharpLanguageServerWorkspaceDiagnosticsResult>;
    probeLanguageServers(request: CSharpWorkspaceRequest): Promise<CSharpLanguageServerProbeResult>;
    getLanguageServerWorkspaceSymbols(request: CSharpLanguageServerWorkspaceSymbolRequest): Promise<CSharpLanguageServerWorkspaceSymbolResult>;
    resolveLanguageServerWorkspaceSymbol(request: CSharpLanguageServerWorkspaceSymbolResolveRequest): Promise<CSharpLanguageServerWorkspaceSymbolResolveResult>;
    getLanguageServerDocumentSymbols(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentSymbolResult>;
    getLanguageServerDocumentLinks(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentLinkResult>;
    resolveLanguageServerDocumentLink(request: CSharpLanguageServerDocumentLinkResolveRequest): Promise<CSharpLanguageServerDocumentLinkResolveResult>;
    getLanguageServerDocumentColors(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerDocumentColorResult>;
    getLanguageServerColorPresentations(request: CSharpLanguageServerColorPresentationRequest): Promise<CSharpLanguageServerColorPresentationResult>;
    getLanguageServerCodeLenses(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerCodeLensResult>;
    resolveLanguageServerCodeLens(request: CSharpLanguageServerCodeLensResolveRequest): Promise<CSharpLanguageServerCodeLensResolveResult>;
    getLanguageServerLinkedEditingRanges(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerLinkedEditingRangeResult>;
    getLanguageServerMonikers(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerMonikerResult>;
    getLanguageServerEvaluatableExpression(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerEvaluatableExpressionResult>;
    getLanguageServerInlineValues(request: CSharpLanguageServerInlineValueRequest): Promise<CSharpLanguageServerInlineValueResult>;
    getLanguageServerSemanticTokens(request: CSharpLanguageServerSemanticTokensRequest): Promise<CSharpLanguageServerSemanticTokensResult>;
    getLanguageServerRangeSemanticTokens(request: CSharpLanguageServerRangeSemanticTokensRequest): Promise<CSharpLanguageServerSemanticTokensResult>;
    getLanguageServerFoldingRanges(request: CSharpLanguageServerDocumentSymbolRequest): Promise<CSharpLanguageServerFoldingRangeResult>;
    getLanguageServerSelectionRanges(request: CSharpLanguageServerSelectionRangeRequest): Promise<CSharpLanguageServerSelectionRangeResult>;
    getLanguageServerHover(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerHoverResult>;
    getLanguageServerDefinitions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult>;
    getLanguageServerDeclarations(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult>;
    getLanguageServerImplementations(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult>;
    getLanguageServerTypeDefinitions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDefinitionResult>;
    prepareLanguageServerCallHierarchy(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerCallHierarchyPrepareResult>;
    getLanguageServerCallHierarchyIncomingCalls(request: CSharpLanguageServerCallHierarchyItemRequest): Promise<CSharpLanguageServerCallHierarchyIncomingResult>;
    getLanguageServerCallHierarchyOutgoingCalls(request: CSharpLanguageServerCallHierarchyItemRequest): Promise<CSharpLanguageServerCallHierarchyOutgoingResult>;
    prepareLanguageServerTypeHierarchy(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerTypeHierarchyPrepareResult>;
    getLanguageServerTypeHierarchySupertypes(request: CSharpLanguageServerTypeHierarchyItemRequest): Promise<CSharpLanguageServerTypeHierarchyResult>;
    getLanguageServerTypeHierarchySubtypes(request: CSharpLanguageServerTypeHierarchyItemRequest): Promise<CSharpLanguageServerTypeHierarchyResult>;
    getLanguageServerDocumentHighlights(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerDocumentHighlightResult>;
    getLanguageServerReferences(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerReferencesResult>;
    getLanguageServerPrepareRename(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerPrepareRenameResult>;
    getLanguageServerNewSymbolNames(request: CSharpLanguageServerNewSymbolNamesRequest): Promise<CSharpLanguageServerNewSymbolNamesResult>;
    getLanguageServerRenameEdits(request: CSharpLanguageServerRenameRequest): Promise<CSharpLanguageServerWorkspaceEditResult>;
    getLanguageServerFormattingEdits(request: CSharpLanguageServerFormattingRequest): Promise<CSharpLanguageServerTextEditResult>;
    getLanguageServerRangeFormattingEdits(request: CSharpLanguageServerRangeFormattingRequest): Promise<CSharpLanguageServerTextEditResult>;
    getLanguageServerRangesFormattingEdits(request: CSharpLanguageServerRangesFormattingRequest): Promise<CSharpLanguageServerTextEditResult>;
    getLanguageServerOnTypeFormattingEdits(request: CSharpLanguageServerOnTypeFormattingRequest): Promise<CSharpLanguageServerTextEditResult>;
    getLanguageServerInlayHints(request: CSharpLanguageServerInlayHintRequest): Promise<CSharpLanguageServerInlayHintResult>;
    resolveLanguageServerInlayHint(request: CSharpLanguageServerInlayHintResolveRequest): Promise<CSharpLanguageServerInlayHintResolveResult>;
    getLanguageServerCodeActions(request: CSharpLanguageServerCodeActionRequest): Promise<CSharpLanguageServerCodeActionResult>;
    resolveLanguageServerCodeAction(request: CSharpLanguageServerCodeActionResolveRequest): Promise<CSharpLanguageServerCodeActionResolveResult>;
    getLanguageServerCompletions(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerCompletionResult>;
    resolveLanguageServerCompletionItem(request: CSharpLanguageServerCompletionItemResolveRequest): Promise<CSharpLanguageServerCompletionItemResolveResult>;
    getLanguageServerInlineCompletions(request: CSharpLanguageServerInlineCompletionRequest): Promise<CSharpLanguageServerInlineCompletionResult>;
    executeLanguageServerCommand(request: CSharpLanguageServerExecuteCommandRequest): Promise<CSharpLanguageServerExecuteCommandResult>;
    getLanguageServerSignatureHelp(request: CSharpLanguageServerTextDocumentPositionRequest): Promise<CSharpLanguageServerSignatureHelpResult>;
    getWorkspaceSymbols(request: CSharpWorkspaceRequest): Promise<CSharpWorkspaceSymbolResult>;
    getCodeContext(request: CSharpCodeContextRequest): Promise<CSharpCodeContextResult>;
    getSemanticInventory(request: CSharpWorkspaceRequest): Promise<CSharpSemanticInventoryResult>;
}

export namespace CSharpKitCommands {
    export const OPEN = {
        id: 'cybervinci.csharpKit.open',
        label: 'CyberVinci: Open C# Kit'
    };
    export const REFRESH = {
        id: 'cybervinci.csharpKit.refresh',
        label: 'C# Kit: Refresh Workspace'
    };
    export const NEW_PROJECT = {
        id: 'cybervinci.csharpKit.newProject',
        label: 'C# Kit: New Project'
    };
    export const NEW_ITEM = {
        id: 'cybervinci.csharpKit.newItem',
        label: 'C# Kit: New Item'
    };
    export const NEW_SOLUTION = {
        id: 'cybervinci.csharpKit.newSolution',
        label: 'C# Kit: New Solution'
    };
    export const ADD_PROJECT_TO_SOLUTION = {
        id: 'cybervinci.csharpKit.addProjectToSolution',
        label: 'C# Kit: Add Project to Solution'
    };
    export const REMOVE_PROJECT_FROM_SOLUTION = {
        id: 'cybervinci.csharpKit.removeProjectFromSolution',
        label: 'C# Kit: Remove Project from Solution'
    };
    export const ADD_PROJECT_REFERENCE = {
        id: 'cybervinci.csharpKit.addProjectReference',
        label: 'C# Kit: Add Project Reference'
    };
    export const REMOVE_PROJECT_REFERENCE = {
        id: 'cybervinci.csharpKit.removeProjectReference',
        label: 'C# Kit: Remove Project Reference'
    };
    export const RESTORE = {
        id: 'cybervinci.csharpKit.restore',
        label: 'C# Kit: Restore'
    };
    export const RESTORE_SOLUTION = {
        id: 'cybervinci.csharpKit.restoreSolution',
        label: 'C# Kit: Restore Solution'
    };
    export const BUILD = {
        id: 'cybervinci.csharpKit.build',
        label: 'C# Kit: Build'
    };
    export const BUILD_SOLUTION = {
        id: 'cybervinci.csharpKit.buildSolution',
        label: 'C# Kit: Build Solution'
    };
    export const CLEAN = {
        id: 'cybervinci.csharpKit.clean',
        label: 'C# Kit: Clean'
    };
    export const CLEAN_SOLUTION = {
        id: 'cybervinci.csharpKit.cleanSolution',
        label: 'C# Kit: Clean Solution'
    };
    export const REBUILD = {
        id: 'cybervinci.csharpKit.rebuild',
        label: 'C# Kit: Rebuild'
    };
    export const REBUILD_SOLUTION = {
        id: 'cybervinci.csharpKit.rebuildSolution',
        label: 'C# Kit: Rebuild Solution'
    };
    export const FORMAT = {
        id: 'cybervinci.csharpKit.format',
        label: 'C# Kit: Format'
    };
    export const FORMAT_SOLUTION = {
        id: 'cybervinci.csharpKit.formatSolution',
        label: 'C# Kit: Format Solution'
    };
    export const PUBLISH = {
        id: 'cybervinci.csharpKit.publish',
        label: 'C# Kit: Publish'
    };
    export const PUBLISH_PROFILE = {
        id: 'cybervinci.csharpKit.publishProfile',
        label: 'C# Kit: Publish Profile'
    };
    export const INIT_USER_SECRETS = {
        id: 'cybervinci.csharpKit.initUserSecrets',
        label: 'C# Kit: Init User Secrets'
    };
    export const LIST_USER_SECRETS = {
        id: 'cybervinci.csharpKit.listUserSecrets',
        label: 'C# Kit: List User Secrets'
    };
    export const SET_USER_SECRET = {
        id: 'cybervinci.csharpKit.setUserSecret',
        label: 'C# Kit: Set User Secret'
    };
    export const REMOVE_USER_SECRET = {
        id: 'cybervinci.csharpKit.removeUserSecret',
        label: 'C# Kit: Remove User Secret'
    };
    export const TRUST_DEV_CERTIFICATE = {
        id: 'cybervinci.csharpKit.trustDevCertificate',
        label: 'C# Kit: Trust ASP.NET HTTPS Dev Certificate'
    };
    export const LIST_EF_MIGRATIONS = {
        id: 'cybervinci.csharpKit.listEfMigrations',
        label: 'C# Kit: List EF Core Migrations'
    };
    export const ADD_EF_MIGRATION = {
        id: 'cybervinci.csharpKit.addEfMigration',
        label: 'C# Kit: Add EF Core Migration'
    };
    export const UPDATE_EF_DATABASE = {
        id: 'cybervinci.csharpKit.updateEfDatabase',
        label: 'C# Kit: Update EF Core Database'
    };
    export const REFRESH_DIAGNOSTICS = {
        id: 'cybervinci.csharpKit.refreshDiagnostics',
        label: 'C# Kit: Refresh Diagnostics'
    };
    export const REFRESH_LSP_WORKSPACE_DIAGNOSTICS = {
        id: 'cybervinci.csharpKit.refreshLanguageServerWorkspaceDiagnostics',
        label: 'C# Kit: Refresh LSP Workspace Diagnostics'
    };
    export const LOAD_CODE_CONTEXT = {
        id: 'cybervinci.csharpKit.loadCodeContext',
        label: 'C# Kit: Build AI/Memory Context'
    };
    export const PROBE_LANGUAGE_SERVERS = {
        id: 'cybervinci.csharpKit.probeLanguageServers',
        label: 'C# Kit: Probe Language Servers'
    };
    export const OPEN_ADAPTER_CONFIG = {
        id: 'cybervinci.csharpKit.openAdapterConfig',
        label: 'C# Kit: Open Adapter Config'
    };
    export const RUN = {
        id: 'cybervinci.csharpKit.run',
        label: 'C# Kit: Run'
    };
    export const RUN_LAUNCH_PROFILE = {
        id: 'cybervinci.csharpKit.runLaunchProfile',
        label: 'C# Kit: Run Launch Profile'
    };
    export const OPEN_LAUNCH_URL = {
        id: 'cybervinci.csharpKit.openLaunchUrl',
        label: 'C# Kit: Open Launch URL'
    };
    export const WATCH = {
        id: 'cybervinci.csharpKit.watch',
        label: 'C# Kit: Watch'
    };
    export const WATCH_LAUNCH_PROFILE = {
        id: 'cybervinci.csharpKit.watchLaunchProfile',
        label: 'C# Kit: Watch Launch Profile'
    };
    export const TEST = {
        id: 'cybervinci.csharpKit.test',
        label: 'C# Kit: Test'
    };
    export const TEST_SOLUTION = {
        id: 'cybervinci.csharpKit.testSolution',
        label: 'C# Kit: Test Solution'
    };
    export const LIST_TESTS = {
        id: 'cybervinci.csharpKit.listTests',
        label: 'C# Kit: Discover Tests'
    };
    export const DEBUG = {
        id: 'cybervinci.csharpKit.debug',
        label: 'C# Kit: Debug'
    };
    export const DEBUG_LAUNCH_PROFILE = {
        id: 'cybervinci.csharpKit.debugLaunchProfile',
        label: 'C# Kit: Debug Launch Profile'
    };
    export const GENERATE_WORKSPACE_FILES = {
        id: 'cybervinci.csharpKit.generateWorkspaceFiles',
        label: 'C# Kit: Generate launch.json/tasks.json'
    };
    export const LIST_PACKAGES = {
        id: 'cybervinci.csharpKit.listPackages',
        label: 'C# Kit: List NuGet Packages'
    };
    export const LIST_PACKAGE_UPDATES = {
        id: 'cybervinci.csharpKit.listPackageUpdates',
        label: 'C# Kit: Check NuGet Updates'
    };
    export const LIST_PACKAGE_HEALTH = {
        id: 'cybervinci.csharpKit.listPackageHealth',
        label: 'C# Kit: Audit NuGet Packages'
    };
    export const SEARCH_PACKAGES = {
        id: 'cybervinci.csharpKit.searchPackages',
        label: 'C# Kit: Search NuGet Packages'
    };
    export const ADD_PACKAGE = {
        id: 'cybervinci.csharpKit.addPackage',
        label: 'C# Kit: Add NuGet Package'
    };
    export const UPDATE_PACKAGE = {
        id: 'cybervinci.csharpKit.updatePackage',
        label: 'C# Kit: Update NuGet Package'
    };
    export const REMOVE_PACKAGE = {
        id: 'cybervinci.csharpKit.removePackage',
        label: 'C# Kit: Remove NuGet Package'
    };
}

export const CSHARP_MICROSOFT_EXTENSION_MAPPINGS: readonly CSharpMicrosoftExtensionMapping[] = [
    {
        microsoftExtensionId: 'ms-dotnettools.csdevkit',
        microsoftName: 'C# Dev Kit',
        cyberVinciComponent: '@cybervinci/csharp-kit',
        capability: 'Solution Explorer-style project tree, .sln/.slnx/.slnf solution and filter awareness, project-reference management, solution/project restore/build/clean/rebuild/format/test commands, project publish and .pubxml publish-profile workflow, ASP.NET user-secrets and HTTPS dev-certificate workflow, EF Core migration/database terminal workflow, project and item templates, CoreCLR debug bridge, ASP.NET Project/Executable launchSettings run/debug/watch, integrated launch URL opening, grouped Test Explorer discovery/execution with xUnit/NUnit/MSTest metadata including MSTest.Sdk/Microsoft.Testing.Platform projects, selected-test debug launch with post-debug TRX capture, .runsettings-aware test commands, global.json dotnet test runner selection awareness, decoupled C#/Razor language-server discovery, initialize probing, did-open/did-close lifecycle notifications, progress/refresh/show-document server-request responses, workspace-symbol/resolve, execute-command/apply-edit, trigger-aware completion item-defaults/text-edits, inline-completion, signature-help, publish/pull/workspace-diagnostics, document-symbol, document-link, document-color, color-presentation, code-lens, semantic-tokens/full-delta, moniker, evaluatable-expression, inline-value, linked-editing-range, folding-range, selection-range, inlay-hint, document-highlight, multi-document-highlight, hover, declaration, definition, implementation, type-definition, references, call-hierarchy, type-hierarchy, prepare-rename, new-symbol-names, rename, formatting, range-formatting, ranges-formatting, on-type-formatting and code-action bridging, AI/Memory C# context packs, NuGet search/install/outdated/vulnerable/deprecated audit/update workflow with global.json SDK intent, .editorconfig/.globalconfig code-style/analyzer inventory, dotnet local tool manifest inventory, Central Package Management, Directory.Build.props/targets and NuGet.config source/mapping awareness, launch/task generation',
        replacementMode: 'implemented',
        notes: 'CyberVinci-owned project workflow layer. It does not embed the Microsoft extension or license-gated UI; CoreCLR debugging uses netcoredbg, vsdbg or another DAP-compatible adapter from env vars, workspace config, workspace dotnet tool manifests, PATH or an already installed VS Code C# extension runtime when available.'
    },
    {
        microsoftExtensionId: 'ms-dotnettools.csharp',
        microsoftName: 'C# for Visual Studio Code',
        cyberVinciComponent: '@cybervinci/csharp-kit + @cybervinci/memory-roslyn',
        capability: 'C# language registration, workspace IntelliSense, snippets, LSP-backed inline ghost completions, workspace symbol search, hover/declaration/definition/outline symbols, document links, document colors/color presentations, CodeLens, semantic tokens with full/delta refresh, inline debug values and evaluatable expressions, linked editing ranges, inlay hints, selection ranges, folding ranges, Call Hierarchy, Type Hierarchy, decoupled C#/Razor language-server adapter discovery, initialize probing, did-open/did-close lifecycle notifications, progress/refresh/show-document server-request responses, workspace-symbol/resolve, execute-command/apply-edit, trigger-aware completion item-defaults/text-edits, inline-completion, signature-help, publish/pull/workspace-diagnostics, document-symbol, document-link, document-color, color-presentation, code-lens, semantic-tokens/full-delta, moniker, evaluatable-expression, inline-value, linked-editing-range, folding-range, selection-range, inlay-hint, document-highlight, multi-document-highlight, hover, declaration, definition, implementation, type-definition, references, call-hierarchy, type-hierarchy, prepare-rename, new-symbol-names, rename, formatting, range-formatting, ranges-formatting, on-type-formatting and code-action bridging, MSBuild diagnostics, global.json SDK inventory, .editorconfig/.globalconfig code-style/analyzer inventory, dotnet local tool manifest inventory, .runsettings test inventory and Directory.Build.props/targets inventory, Roslyn semantic inventory, Razor/cshtml directive and import-context inventory, and central NuGet package/config/audit metadata',
        replacementMode: 'adapter-boundary',
        notes: 'CyberVinci provides local Monaco completions/snippets, LSP-backed inline ghost completions, workspace symbol search, symbol navigation, CodeLens, Call Hierarchy, Type Hierarchy, Razor directive inventory, dotnet build diagnostics, language-server command discovery/probing and on-demand workspace-symbol/workspace-symbol-resolve/execute-command/apply-edit/trigger-aware completion with CompletionList item defaults and text edits/inline-completion/signature-help/publish-diagnostics/pull-diagnostics/workspace-diagnostics/document-symbol/document-link/document-color/color-presentation/code-lens/semantic-tokens/full-delta/moniker/evaluatable-expression/inline-value/linked-editing-range/folding-range/selection-range/inlay-hint/document-highlight/multi-document-highlight/hover/declaration/definition/implementation/type-definition/references/call-hierarchy/type-hierarchy/prepare-rename/new-symbol-names/rename/formatting/range-formatting/ranges-formatting/on-type-formatting/diagnostic-aware code-action requests from env vars, workspace config, workspace dotnet tool manifests for csharp-ls/rzls/razor-ls or PATH, plus did-open/did-close lifecycle notifications and client responses for configuration, workspace folders, progress, refresh, show-document, dynamic registration and message requests. It includes lazy workspace-symbol, completion-item, document-link, code-lens, inlay-hint and code-action resolution, and on-demand Roslyn semantic inventory. Full LSP editing remains a pluggable adapter boundary.'
    },
    {
        microsoftExtensionId: 'ms-dotnettools.vscode-dotnet-runtime',
        microsoftName: '.NET Install Tool',
        cyberVinciComponent: '@cybervinci/csharp-kit',
        capability: '.NET SDK/runtime detection and setup guidance',
        replacementMode: 'external-runtime',
        notes: 'CyberVinci detects and uses the system dotnet SDK. It does not download SDKs automatically.'
    },
    {
        microsoftExtensionId: 'ms-dotnettools.vscodeintellicode-csharp',
        microsoftName: 'IntelliCode for C# Dev Kit',
        cyberVinciComponent: '@cybervinci/csharp-kit + @cybervinci/memory-roslyn',
        capability: 'AI/Memory C# context packs and deterministic local suggestion surface for assistant workflows',
        replacementMode: 'adapter-boundary',
        notes: 'C# Kit builds prompt-ready project context from metadata, symbols and Roslyn/Memory hints; model-backed ranking remains a pluggable assistant boundary instead of the Microsoft IntelliCode model.'
    }
];

export function isCSharpProjectFileName(path: string): boolean {
    return path.toLowerCase().endsWith('.csproj');
}

export function isCSharpSolutionFileName(path: string): boolean {
    const lower = path.toLowerCase();
    return lower.endsWith('.sln') || lower.endsWith('.slnx') || lower.endsWith('.slnf');
}

export function isCSharpSourceFileName(path: string): boolean {
    const lower = path.toLowerCase();
    return lower.endsWith('.cs') || lower.endsWith('.cshtml') || lower.endsWith('.razor') || lower.endsWith('.csproj') || lower.endsWith('.sln') || lower.endsWith('.slnx');
}

export function csharpProjectDisplayName(projectPath: string): string {
    const normalized = projectPath.replace(/\\/g, '/');
    const fileName = normalized.slice(normalized.lastIndexOf('/') + 1);
    return fileName.replace(/\.csproj$/i, '');
}

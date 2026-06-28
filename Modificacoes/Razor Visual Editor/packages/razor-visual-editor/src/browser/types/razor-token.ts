export enum RazorTokenKind {
    InlineExpression = 'InlineExpression',
    ExplicitExpression = 'ExplicitExpression',
    CodeBlock = 'CodeBlock',
    IfBlock = 'IfBlock',
    ElseBlock = 'ElseBlock',
    ForEachBlock = 'ForEachBlock',
    ForBlock = 'ForBlock',
    SwitchBlock = 'SwitchBlock',
    SectionBlock = 'SectionBlock',
    HelperCall = 'HelperCall',
    UrlCall = 'UrlCall',
    HtmlCall = 'HtmlCall',
    RenderCall = 'RenderCall',
    ModelDirective = 'ModelDirective',
    UsingDirective = 'UsingDirective',
    InjectDirective = 'InjectDirective',
    PageDirective = 'PageDirective',
    LayoutAssignment = 'LayoutAssignment',
    TagHelperDirective = 'TagHelperDirective',
    Unknown = 'Unknown'
}

export interface RazorToken {
    id: string;
    kind: RazorTokenKind;
    originalText: string;
    placeholderHtml: string;
    startIndex: number;
    endIndex: number;
    editableMode: 'locked' | 'inline' | 'structural';
    checksum: string;
}

export interface RazorSourceMap {
    filePath: string;
    originalHash: string;
    processedHash: string;
    tokens: RazorToken[];
    createdAt: string;
}

export interface RazorProtectionResult {
    processedHtml: string;
    sourceMap: RazorSourceMap;
    warnings: string[];
    elapsedMs: number;
}

export interface RazorValidationIssue {
    tokenId?: string;
    severity: 'error' | 'warning';
    message: string;
}

export interface RazorRestoreResult {
    html: string;
    issues: RazorValidationIssue[];
}

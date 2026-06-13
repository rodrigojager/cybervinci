import { RazorTokenKind } from '../types/razor-token';

export const RAZOR_DIRECTIVE_KINDS: Record<string, RazorTokenKind> = {
    model: RazorTokenKind.ModelDirective,
    using: RazorTokenKind.UsingDirective,
    inject: RazorTokenKind.InjectDirective,
    page: RazorTokenKind.PageDirective,
    addTagHelper: RazorTokenKind.TagHelperDirective,
    removeTagHelper: RazorTokenKind.TagHelperDirective,
    namespace: RazorTokenKind.Unknown,
    functions: RazorTokenKind.CodeBlock
};

export const RAZOR_BLOCK_KINDS: Record<string, RazorTokenKind> = {
    if: RazorTokenKind.IfBlock,
    foreach: RazorTokenKind.ForEachBlock,
    for: RazorTokenKind.ForBlock,
    while: RazorTokenKind.ForBlock,
    switch: RazorTokenKind.SwitchBlock,
    section: RazorTokenKind.SectionBlock,
    try: RazorTokenKind.CodeBlock,
    lock: RazorTokenKind.CodeBlock
};

export const RAZOR_INLINE_ROOTS = new Set([
    'Model',
    'ViewBag',
    'ViewData',
    'TempData',
    'Html',
    'Url',
    'RenderBody',
    'RenderSection',
    'Component',
    'await'
]);

export const RAZOR_TAG_HELPER_TRAITS = [
    'asp-controller',
    'asp-action',
    'asp-route-id',
    'asp-for',
    'asp-validation-for',
    'asp-items',
    'asp-area'
];

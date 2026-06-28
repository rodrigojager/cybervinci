import { expect } from 'chai';
import { RazorTokenKind } from '../browser/types/razor-token';
import { RazorTokenizer } from '../browser/razor/razor-tokenizer';

describe('RazorTokenizer', () => {
    it('protects MVP Razor tokens and ignores common false positives', () => {
        const tokenizer = new RazorTokenizer();
        const result = tokenizer.tokenize(`@model Demo.ViewModel
<style>
@media (max-width: 768px) { .x { display: none; } }
</style>
<p>contato@empresa.com @@literal @Model.Title @ViewBag.Message @Url.Content("~/Content/site.css")</p>
@if (Model.Active) {
    <div>@Html.DisplayFor(m => m.Name)</div>
} else {
    <span>Inactive</span>
}
@foreach (var item in Model.Items) {
    <div>@item.Name</div>
}
@section Scripts {
    <script src="~/Scripts/app.js"></script>
}`);

        expect(result.processedHtml).to.contain('data-cv-razor-token="rz_001"');
        expect(result.processedHtml).to.contain('contato@empresa.com');
        expect(result.processedHtml).to.contain('@@literal');
        expect(result.processedHtml).to.contain('@media');
        expect(result.tokens.map(token => token.kind)).to.include.members([
            RazorTokenKind.ModelDirective,
            RazorTokenKind.InlineExpression,
            RazorTokenKind.UrlCall,
            RazorTokenKind.IfBlock,
            RazorTokenKind.ForEachBlock,
            RazorTokenKind.SectionBlock
        ]);
        expect(result.tokens.some(token => token.originalText.includes('contato@empresa.com'))).to.equal(false);
    });
});

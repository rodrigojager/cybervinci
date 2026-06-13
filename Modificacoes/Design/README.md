# Design

Separated packages/vendor:

- `packages/openpencil-cybervinci-extension` → `@cybervinci/openpencil-extension`
- `vendor/openpencil` → vendored OpenPencil source from `https://github.com/ZSeven-W/openpencil`
- `Modificacoes/Skills/System/OpenPencil/pen-ai-skills` → canonical Markdown source for OpenPencil system skills

Documentation:

- `docs/openpencil-parity.md`

There is no Theia override patch in this folder now; the previous doc-only override was moved out of `overrides/theia`.

Tests/resources:

- `examples/playwright/src/tests/openpencil-acceptance.test.ts`

Purpose: embedded OpenPencil visual design editor, runtime adapter, templates, AI review, Figma/design command support, and code generation hooks.

Requires:

- `Branding/packages/branding`
- `AI-Providers/packages/ai-providers`
- `AI-Providers/packages/ai-runtime`

Canvas AI generation uses the provider-neutral CyberVinci AI Runtime. Each prompt-to-design, continuation, or selected-node edit interaction can choose provider, model, and reasoning effort for that request. The default Canvas AI path applies incremental stages to the open canvas so structure, content, and refinement appear as separate validated changes instead of waiting for one final operation list.

Apply by copying package and vendor folder to the same relative locations in a baseline Theia tree, adding `@cybervinci/openpencil-extension`, then rebuilding.

The installer also copies `Modificacoes/Skills/System/OpenPencil` into the target root as `Skills/System/OpenPencil` for environments that are not built directly inside this CyberVinci workspace.

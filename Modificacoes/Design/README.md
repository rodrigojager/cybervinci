# Design

Separated packages/vendor:

- `packages/openpencil-cybervinci-extension` → `@cybervinci/openpencil-extension`
- `vendor/openpencil` → vendored OpenPencil source from `https://github.com/ZSeven-W/openpencil`

Documentation:

- `docs/openpencil-parity.md`

There is no Theia override patch in this folder now; the previous doc-only override was moved out of `overrides/theia`.

Tests/resources:

- `examples/playwright/src/tests/openpencil-acceptance.test.ts`

Purpose: embedded OpenPencil visual design editor, runtime adapter, templates, AI review, Figma/design command support, and code generation hooks.

Requires:

- `Branding/packages/branding`

Apply by copying package and vendor folder to the same relative locations in a baseline Theia tree, adding `@cybervinci/openpencil-extension`, then rebuilding.

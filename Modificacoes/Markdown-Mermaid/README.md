# CyberVinci Markdown Mermaid Preview

Separated package:

- `packages/markdown-mermaid-preview` -> `@cybervinci/markdown-mermaid-preview`

Runtime placement:

- Mirrored into `Workload/theia/packages/cybervinci-markdown-mermaid-preview`.
- Loaded by the CyberVinci browser/electron applications through their package dependencies.

Upgrade note:

Keep Mermaid support in this package. It registers a higher-priority `PreviewHandler`
for Markdown files and does not patch `@theia/preview`, so updating Theia should only
require reapplying the package and app dependency manifests.

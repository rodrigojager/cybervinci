# CyberVinci AI Chat Experience

This overlay owns CyberVinci-specific AI Chat UX changes.

The runtime package is mirrored into `Workload/theia/packages/cybervinci-ai-chat-experience`
and loaded as a Theia extension by the browser/electron applications. Its frontend
module replaces Theia's `AIChatInputWidget` binding with `CyberVinciAIChatInputWidget`.

Keep new CyberVinci chat UX work in this package whenever possible. Avoid adding
large behavior directly to `@theia/ai-chat-ui`; if the base widget lacks a required
extension point, add the smallest possible hook there and keep the implementation
in this overlay.

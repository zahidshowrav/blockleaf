---
'@blockleaf/editor': minor
---

Surface `onContentError`, `emitContentError`, and `enableContentCheck` to the host application (`FC-01`).

When stored content contains an invalid structure or unrecognised node types, the editor now intercepts the parse error and reports it through `onContentError` rather than throwing an unhandled exception or crashing the page. Providing `onContentError` automatically enables content checking (`enableContentCheck: true` and `emitContentError: true`).

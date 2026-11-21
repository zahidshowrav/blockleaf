---
'@blockleaf/editor': minor
---

Pasting a long document is fast (`HD-13`). Pasting five thousand blocks took 20 seconds and now takes under two.

Pasted blocks now get their ids in one pass, before they reach the document. The new `PastedBlockIds` extension does this, and both presets include it. The `UniqueID` exported from `@blockleaf/editor/extensions` is now Blockleaf's own copy of Tiptap's: it leaves pastes and drops to `PastedBlockIds` by default, and `UniqueID.configure({ types })` keeps that. `isPasteTransaction` is exported for anyone who gives `UniqueID` a `filterTransaction` of their own. Pasting Markdown text now runs the same paste hooks as pasting HTML. Stored documents do not change.

---
'@blockleaf/editor': minor
---

An unknown block, inline node or mark is kept, not refused (`FC-03`).

A stored document with a node or mark this editor does not know — a block from a preset or subpath it did not load, or a node from an extension not installed here — used to fail the content check and open locked. Each one now opens as a placeholder that names its type, the rest of the document stays editable, and `onChange` hands back the original JSON exactly as it came in. A placeholder can be selected, dragged and deleted; it is never rebuilt from pasted HTML.

The placeholders ship as `UnknownContent` in both presets, and the editor adds it to a host's own `extensions` array. `wrapUnknownContent` and `unwrapUnknownContent` do the swap for hosts that call `setContent` or `getJSON` directly. The placeholder text is `labels.unknown`.

A document whose structure the schema refuses, or whose `schemaVersion` is newer, is still locked by `incompatibleDocument`.

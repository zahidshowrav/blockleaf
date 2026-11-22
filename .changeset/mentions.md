---
'@blockleaf/editor': minor
---

Mentions, from the new `@blockleaf/editor/mentions` subpath. `withMentions(extensions, { items })` opens a picker on `@`, asks your `items` lookup (sync or async) for matches, and inserts an inline `mention` node storing `{ id, label, kind }`. More than one trigger — `@` for people, `#` for pages — goes in `triggers`. The picker's strings are under `labels.mentions`. Adds about 0.86 kB on top of the editor, and nothing without the import.

**Schema version 2.** `SCHEMA_VERSION` is now `2`, for `mention` and the rest of the batch that follows it. The migration from version 1 changes nothing, so every stored document opens as before; an editor that only knows version 1 opens a version 2 document read-only. Upgrade `@blockleaf/renderer` first.

---
'@blockleaf/editor': minor
---

Mentions, from the new `@blockleaf/editor/mentions` subpath: `withMentions(extensions, { items })` inserts a `mention` node on `@`. `SCHEMA_VERSION` is now `2`: stored documents do not change, but an older editor opens a version 2 document read-only. Upgrade `@blockleaf/renderer` before the editor.

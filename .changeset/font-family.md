---
'@blockleaf/editor': minor
---

Font family, in `@blockleaf/editor/text-style`. A new `fontFamily` mark stores a token — `{ family: 'serif' }` — never a font name, and resolves it through `--bl-font-<token>`. `sans`, `serif` and `mono` are built in, and any other lower-case token works once you define its custom property. The bubble menu gains a Font panel where the mark is loaded; `setFontFamily` / `unsetFontFamily` are the commands, and strings are under `labels.font`. New in schema version 2.

---
'@blockleaf/editor': minor
---

Font size, in `@blockleaf/editor/text-style`. A new `fontSize` mark stores a token — `{ size: 'lg' }` — never a length, and resolves it through `--bl-font-size-<token>`, an `em` value that scales with the editor. `sm`, `lg` and `xl` are built in. The Font panel gains a Size group; `setFontSize` / `unsetFontSize` are the commands. New in schema version 2.

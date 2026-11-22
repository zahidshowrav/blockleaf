---
'@blockleaf/editor': minor
---

Text colour, in `@blockleaf/editor/text-style`. A new `textColor` mark stores a token — `{ color: 'red' }` — never a CSS colour, and resolves it through `--bl-text-<token>`. Nine built-in colours have light and dark values, each at least 4.5:1 on its background; any other lower-case token works once you define its custom property. The bubble menu gains a Text color palette where the mark is loaded, and `setTextColor` / `unsetTextColor` are the commands. Strings are under `labels.textColor`. New in schema version 2.

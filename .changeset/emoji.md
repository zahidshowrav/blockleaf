---
'@blockleaf/editor': minor
---

Emoji, from the new `@blockleaf/editor/emoji` subpath. `withEmoji(extensions)` opens a picker on `:` and two characters, searches 1,849 emoji (Emoji 14.0 and older) by name and keyword — `:tada`, `:+1`, `:thumbs_up` — and inserts the emoji as plain text, so nothing new is stored. The list is a separate chunk of about 36 kB, loaded the first time the picker opens; the picker itself adds 1.82 kB. Pass `items` for your own list, and `searchEmoji` to rank it. The picker's strings are under `labels.emoji`. The mention picker now shares its list component.

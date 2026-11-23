---
'@blockleaf/editor': minor
---

Background colour for text. The `highlight` mark's existing `color` now takes a token — the same nine names as text colour — resolved through `--bl-highlight-<token>`, with a pale light-theme and a deep dark-theme tint for each. With `@blockleaf/editor/text-style` the bubble menu's colour panel becomes "Color", with Text and Background groups. A hex, `rgb()` or `hsl()` value stored before still renders; a value that is none of these is no longer written into `style`. `labels.textColor` gains `text` and `background`, and its `button` is now "Color".

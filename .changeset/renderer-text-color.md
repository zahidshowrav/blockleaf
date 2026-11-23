---
'@blockleaf/renderer': minor
---

Renders the `textColor` mark from schema version 2 as `<span data-color style="color: var(--bl-text-<token>, currentColor)">`, on both targets. A colour that is not a token keeps its text and drops the span.

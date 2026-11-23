---
'@blockleaf/renderer': minor
---

Renders the `fontSize` mark from schema version 2 as `<span data-font-size style="font-size: var(--bl-font-size-<token>, 1em)">`, on both targets. A size that is not a token keeps its text and drops the span.

---
'@blockleaf/renderer': minor
---

Renders the `fontFamily` mark from schema version 2 as `<span data-font-family style="font-family: var(--bl-font-<token>, inherit)">`, on both targets. A family that is not a token keeps its text and drops the span.

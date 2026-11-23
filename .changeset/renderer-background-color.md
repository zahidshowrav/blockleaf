---
'@blockleaf/renderer': minor
---

Renders a `highlight` colour token from schema version 2 as `background-color: var(--bl-highlight-<token>, <token>)`, on both targets, through the new `highlightBackground`. A hex, `rgb()` or `hsl()` value renders as before. `highlightColor` now returns only a colour the renderers will draw: one with a `;` or anything else that is neither a token nor a plain colour is treated as no colour, so the text keeps a plain highlight instead of carrying stray CSS.

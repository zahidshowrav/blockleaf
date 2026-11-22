---
'@blockleaf/editor': minor
---

A print stylesheet (`PA-19`), so a browser's Save as PDF gives a readable document with nothing else installed. It applies to the editor and to `@blockleaf/renderer` output. When printing, the chrome is hidden, blocks such as code, quotes, callouts, images and table rows stay whole where they fit, code wraps, and a link prints its address after its text.

It prints light. The system dark theme now applies on screen only (`@media screen and (prefers-color-scheme: dark)`), and a forced `data-theme="dark"` prints with the light palette, because browsers drop backgrounds when printing. A palette of your own on `.blockleaf-editor` is not touched.

---
'@blockleaf/renderer': minor
---

Renders the `tableOfContents` block from schema version 2 as `<nav class="blockleaf-toc">` with a link to each heading, on both targets. In a document with one, headings also get an `id` to link to; every other document renders exactly as before. The new `tableOfContents(doc)` returns the entries for a sidebar, every node renderer now receives `root`, the document being rendered, and `labels.tableOfContents` names the list.

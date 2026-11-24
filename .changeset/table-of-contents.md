---
'@blockleaf/editor': minor
---

Table of contents, from the new `@blockleaf/editor/toc` subpath. `withTableOfContents(extensions)` adds a `tableOfContents` block, inserted from the slash menu, that lists the document's headings, each a link to its heading, and follows every edit. It stores nothing but its id. `useTableOfContents(editor)` returns the same list for a sidebar of your own, and `getTableOfContents(doc)` reads it from stored JSON; `goToHeading(id)` moves the caret to a heading. Strings are under `labels.tableOfContents`, and the slash entry under `blockTypes['table-of-contents']`. Adds 0.72 kB on top of the editor. New in schema version 2.

---
'@blockleaf/editor': minor
---

Make a table readable by a screen reader, and survivable on a narrow screen.

Header cells now carry `scope`, decided from the document's shape the same way `@blockleaf/renderer` decides it — a header among nothing but headers heads its column, one sitting among data cells heads its row. Until now the editor emitted a bare `<th>`, so the same document announced one way while it was edited and another once it was published. A header nobody has typed in yet is named rather than announcing as nothing at all.

The caret's position is announced as it moves between cells, through a polite live region: "Row 2 of 4, column 3 of 3". Counted with `TableMap`, so a merged cell reports the first column it actually occupies rather than a number that would be false.

A table too wide for the screen scrolls inside a focusable, labelled region instead of pushing the page sideways. `overflow-x` alone did not hold: a grid or flex item defaults to `min-width: auto`, so a 780px table pushed the host's own layout wider than the screen and the wrapper inherited that width with nothing left to scroll. The wrapper uses `contain: inline-size`, which keeps the table's width out of the host's layout — no `min-width: 0` required of consumers.

None of this is stored. No `SCHEMA_VERSION` moved and nothing in anyone's database has to change.

New labels under `table`: `cellPosition`, `scrollRegion` and `emptyHeader`.

---
'@blockleaf/renderer': patch
---

Render tables as real table markup, in both targets (RD-07).

prosemirror-tables has no concept of a table section, so the editor writes
every row into `<tbody>`, header cells included. That is tolerable in a
surface the user is looking at and not tolerable in output: `<thead>` is most
of what an email client, an RSS reader or a screen reader has to go on.

So a leading row made entirely of header cells becomes `<thead>`, and the rest
`<tbody>`. A row with a mix of headers and cells is a header _column_, which
prosemirror-tables also allows, and is left in `<tbody>` rather than claiming
to label everything below it. Header cells carry `scope`: `col` in a header
row, `row` for a header cell leading a body row.

Stored column widths move into `<colgroup>`, where the editor also puts them.
The `colwidth` attribute the editor additionally writes on each cell is
dropped — it is not an HTML attribute, and the width is already in the
`<col>`.

This is the only node the renderer deliberately writes differently from the
editor. Everything else is held to it by the parity suite.

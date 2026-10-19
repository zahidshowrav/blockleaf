---
'@blockleaf/editor': patch
---

Align a task item's text with its own checkbox.

The item's content lives in a `div` the node view owns, which sits outside the `> * + *` rule that spaces top-level blocks, so its paragraph kept the browser's default `1em` margin and dropped the first line about 18px below the checkbox beside it. The first and last child of that wrapper now have their outer margins removed; spacing between paragraphs inside one item is untouched.

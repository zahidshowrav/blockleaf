---
'@blockleaf/editor': patch
---

Fix task list items rendering stacked instead of inline, and list markers
disappearing under a CSS reset.

The task item rules were keyed to `li[data-type='taskItem']`, an attribute
that only exists in serialised output. Tiptap builds the live item in
`addNodeView` from the node's own attributes — `data-checked`, `data-id` — and
never applies the `data-type` that `renderHTML` merges in. So the selector
styled every rendered page and no actual editor, and the checkbox sat above
its label rather than beside it for as long as task lists have existed. The
rules now match through the parent list, `ul[data-type='taskList'] > li`,
which is present in both.

`list-style` is now stated rather than inherited from the user agent. Every
common reset strips list markers, so bullets and numbers vanished in any app
using Tailwind's preflight or normalize — and "works without a CSS framework"
should not mean "breaks with one".

Both were found by putting a task list and a bullet list in the documentation
site's live demo.

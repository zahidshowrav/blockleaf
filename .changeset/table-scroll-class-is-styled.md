---
'@blockleaf/editor': patch
---

Style the box `@blockleaf/renderer` puts a published table in.

`.blockleaf-table-scroll` joins `.tableWrapper` on the containment and overflow rules. Deliberately unscoped, unlike every prose rule: rendered output lands in whatever markup the host wrote, and a table that only behaves when somebody remembered to add `.blockleaf-editor__content` is a table that does not behave.

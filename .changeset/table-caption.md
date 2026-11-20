---
'@blockleaf/editor': minor
---

A table can have a caption (`HD-10`).

**Toggle caption** in the row and column menus puts a caption under the table and the caret in it, or takes it away. The caption is rich text, so a credit can carry its link. In the caption, Enter moves to a new paragraph below, and Backspace in an empty caption removes it. Deleting the table deletes its caption too.

A captioned table is stored as a new `figure` node holding the table and then a new `caption` node. The table itself is stored exactly as it is without a caption. Both are new node types, so `SCHEMA_VERSION` stays `1` and nothing migrates. The validator accepts them, `Figure` and `Caption` are exported from `@blockleaf/editor/extensions`, and the command is `toggleTableCaption()`. New labels: `table.actions['toggle-caption']` and `placeholder.caption`.

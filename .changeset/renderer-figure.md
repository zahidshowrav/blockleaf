---
'@blockleaf/renderer': minor
---

Render a captioned table (`HD-10`): a `figure` node becomes `<figure class="blockleaf-figure">` and its `caption` becomes `<figcaption class="blockleaf-caption">`, as the editor writes them. `toPlainText` keeps the caption apart from the last cell.

An older renderer renders nothing for a `figure`, so the whole captioned table is missing until this version is installed. Upgrade the renderer before the editor.

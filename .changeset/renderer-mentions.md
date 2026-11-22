---
'@blockleaf/renderer': minor
---

Renders the `mention` node from schema version 2 on both targets, exactly as the editor writes it: `<span class="blockleaf-mention" data-mention-id data-label data-kind>@label</span>`. `toPlainText` reads a mention as `@label`.

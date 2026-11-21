---
'@blockleaf/renderer': minor
---

A `details` node now renders its first block inside `<summary>`, as its title, followed by the rest of its blocks (`F23`). Before, it rendered a bare `<details>`, so a browser showed its own "Details" label. This matches the toggle block the editor now writes. A document built by hand that already uses `details` will show its first block as the title.

---
'@blockleaf/renderer': minor
---

Renders the `video` block from schema version 2 on both targets, as `<video controls>`. Its source goes through the new `sanitizeMediaSrc` (`https:` or relative, no `data:` URLs) and an unsafe one renders nothing. New label: `video`. Both entries are now budgeted at 3.5 kB.

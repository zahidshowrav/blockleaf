---
'@blockleaf/renderer': minor
---

Renders the `video` and `audio` blocks from schema version 2 on both targets: `<video controls>` and `<audio controls>` named by its title. Sources go through the new `sanitizeMediaSrc` (`https:` or relative, no `data:` URLs) and an unsafe one renders nothing. New labels: `video` and `audio`. Both entries are now budgeted at 3.5 kB.

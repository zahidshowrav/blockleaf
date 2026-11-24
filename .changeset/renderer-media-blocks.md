---
'@blockleaf/renderer': minor
---

Renders the `video`, `audio` and `attachment` blocks from schema version 2 on both targets: `<video controls>`, `<audio controls>` named by its title, and an `<a download>` with the file's name and size. Sources go through the new `sanitizeMediaSrc` (`https:` or relative, no `data:` URLs) and an unsafe one renders nothing. New labels: `video`, `audio`, `fileSize` and `file`. `toPlainText` counts a file as its name. Both entries grow by 0.44 kB.

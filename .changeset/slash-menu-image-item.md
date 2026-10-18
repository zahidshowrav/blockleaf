---
'@blockleaf/editor': minor
---

Add an Image item to the slash menu, and an `isAvailable` predicate to `SlashCommand`.

`/image` opens the file picker and runs the upload adapter, so uploading no longer requires a drop or a paste. The item hides itself when no `upload` adapter is configured, because the command it calls does not exist without one.

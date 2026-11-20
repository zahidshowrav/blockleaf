---
'@blockleaf/editor': minor
---

Add `migrate()`, which brings a stored document up to the current `SCHEMA_VERSION` (`HD-09`).

It walks a document saved at an older `schemaVersion` forward one version at a time and never changes its input. A document already at the current version comes back as the same object, a newer one comes back untouched, and anything that is not a Blockleaf document comes back untouched. The editor now runs it on `defaultValue` by itself; call it yourself before `setContent()`, before validating on the server, and before rendering with `@blockleaf/renderer`.

`SCHEMA_VERSION` is still `1`, so nothing migrates yet. This is the machinery the first bump needs. The stored shape does not change.

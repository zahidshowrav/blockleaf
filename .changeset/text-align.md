---
'@blockleaf/editor': minor
---

Text alignment for paragraphs and headings. `withTextStyle` now also adds `setTextAlign`, `unsetTextAlign`, `Mod-Shift-L`/`E`/`R`/`J`, and an Align group in the block menu. The stored `textAlign` attribute — `left`, `center`, `right` or `justify` — is in every preset, so an editor without the subpath still shows and keeps it; an unaligned block stores nothing, exactly as before. New in schema version 2. `onChange` now leaves out attributes whose value is `undefined`.

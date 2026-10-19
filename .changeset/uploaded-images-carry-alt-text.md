---
'@blockleaf/editor': minor
---

Never insert an uploaded image without alt text.

An image with no `alt` is the one critical accessibility failure an editor can hand a screen reader, which falls back to announcing the URL. `UploadResult` now takes an optional `alt`, and an upload that does not supply one gets the file's own name with the extension dropped and `-`/`_` turned into spaces — `red-balloon_02.png` becomes `red balloon 02`. An empty string is kept as given, because that marks the image decorative and is a different statement from having no description.

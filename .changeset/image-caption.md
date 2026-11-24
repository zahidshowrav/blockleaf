---
'@blockleaf/editor': minor
---

Images take a caption. The image toolbar has a new **Toggle caption** button, and `toggleCaption()` captions the selected image, or the table around the caret. A captioned image is stored like a captioned table: a `figure` holding the image, unchanged, then a `caption`. The caption takes `textAlign`, set with `setCaptionAlign(alignment | null)`; with none, it follows the image's alignment. The new label is `image.actions['toggle-caption']`. `toggleTableCaption()` still works and only acts on tables. New in schema version 2.

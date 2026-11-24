---
'@blockleaf/editor': minor
---

Caption toolbar, from the new `@blockleaf/editor/media` subpath. `withMedia(extensions)` adds a toolbar that appears while the caret is in a caption, with the caption's own alignment (left, centre, right; pressing it again follows the block once more) and Remove caption. It stands down for a selection, so the text toolbar can still link a credit. Strings are under `labels.caption`. `createToggleCaptionAction(title)` is the caption button shared by every captionable block's toolbar. Adds about 0.2 kB on top of the editor.

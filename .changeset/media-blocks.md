---
'@blockleaf/editor': minor
---

Video and audio blocks, from `@blockleaf/editor/media`. `withMedia(extensions)` now adds `video` and `audio` blocks, a toolbar for a selected one (alignment for video, caption, delete), and Video and Audio items in the slash menu. Uploads go to the block for the file's type, and with the blocks loaded the default `uploadAccept` takes video and audio as well as images; a host's own `uploadAccept` is used as given. `openUploadPicker(accept?)` can narrow the picker. Sources must be `https:` or relative — no `data:` URLs — checked by the schema (`sanitizeMediaSrc`). New strings are under `labels.media`. New in schema version 2.

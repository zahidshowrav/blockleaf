---
'@blockleaf/editor': minor
---

Video block, from `@blockleaf/editor/media`. `withMedia(extensions)` now adds a `video` block, a toolbar for a selected one (alignment, caption, delete), and a Video item in the slash menu. Uploads go to the block for the file's type, and with the block loaded the default `uploadAccept` takes video as well as images; a host's own `uploadAccept` is used as given. `openUploadPicker(accept?)` can narrow the picker. Sources must be `https:` or relative — no `data:` URLs — checked by the schema (`sanitizeMediaSrc`). New strings are under `labels.media`. New in schema version 2.

---
'@blockleaf/editor': minor
---

Video, audio and file blocks, from `@blockleaf/editor/media`. `withMedia(extensions)` now adds `video`, `audio` and `attachment` blocks, a toolbar for a selected one (alignment for video, caption, delete), and Video, Audio and File items in the slash menu. Uploads go to the block for the file's type, and with the blocks loaded the default `uploadAccept` takes video, audio and any file as well as images; a host's own `uploadAccept` is used as given. `openUploadPicker(accept?)` can narrow the picker. Sources must be `https:` or relative — no `data:` URLs — checked by the schema (`sanitizeMediaSrc`). New strings are under `labels.media`. New in schema version 2.

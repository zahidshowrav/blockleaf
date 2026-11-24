---
'@blockleaf/editor': minor
---

Resize images and videos, from `@blockleaf/editor/media`. A selected one has a handle on each side; dragging changes the width only, with the height following the picture, and is stored as pixels when you let go. **Full width**, in the image and video toolbars, stores `width: "full"` — a name, not a pixel count. `Alt-Shift-ArrowLeft` / `ArrowRight` narrow and widen from the keyboard. New commands `setMediaWidth(width)` and `toggleMediaFullWidth()`; `withMedia(…, { resize: false })` leaves it out. The core reads and draws `"full"`, so an editor without the subpath shows a stored width. New labels: `image.actions['full-width']` and `media.actions['full-width']`. New in schema version 2.

---
'@blockleaf/editor': patch
---

Add the image block with alt text and alignment (MC-04). The node is
hand-rolled rather than taken from `@tiptap/extension-image`, and `src` is
sanitised in the schema: `https:`, relative paths and raster data URLs are
allowed, while `javascript:`, `blob:`, `http:` and SVG data URLs are rejected.
An unsafe `<img>` arriving through a paste is dropped rather than stored with
a null source.

Selecting an image opens a toolbar for alignment, alt text and delete. An
empty alt is kept rather than discarded, since that is how an image is marked
decorative.

The bubble menu's link editor is now one of a general panel slot, so the
toolbar's keyboard handling lives in one place. Three CSS classes were
renamed to match: `blockleaf-bubble-menu__link-editor`, `__link-input` and
`__link-error` are now `__panel`, `__panel-input` and `__panel-error`.
Closing a panel now returns focus to the button that opened it, which the
link editor had never managed.

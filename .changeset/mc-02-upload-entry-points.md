---
'@blockleaf/editor': patch
---

Add drop, paste and picker entry points for uploads (MC-02). Dropping files on
the editor, pasting them from the clipboard, or calling `openUploadPicker`
screens each file for type and size **before** it leaves the browser, then
hands it to the adapter and inserts an image where it landed.

The in-flight placeholder is a widget decoration rather than a node, so
ProseMirror maps its position through every edit made while the upload runs —
an image dropped at the end of a paragraph still lands there after typing
above it — and nothing has to be stripped out of the document before saving.

`upload`, `uploadAccept`, `uploadMaxBytes` and `onUploadError` are new options
on `useBlockleafEditor` and `<BlockleafEditor>`. Without an adapter the
extension is not added at all, so files fall through to the browser rather
than being swallowed.

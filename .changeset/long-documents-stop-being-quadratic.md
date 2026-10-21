---
'@blockleaf/editor': minor
---

Open a long document in seconds rather than minutes.

A document that has never been through this editor — an import, a migration, anything carrying no block ids — took **137 seconds** to open at ten thousand blocks. It now takes about two. `@tiptap/extension-unique-id` assigns missing ids inside ProseMirror, one `setNodeMarkup` step per block on a single transaction, with every step applied to the document the step before it produced; that is quadratic. The editor now stamps them in one linear pass over plain JSON before the document reaches ProseMirror, so the extension finds nothing to do on load and keeps the incremental job it is good at.

| Blocks | Before | Now  |
| ------ | ------ | ---- |
| 1,000  | 2.1s   | 0.5s |
| 5,000  | 34.2s  | 1.3s |
| 10,000 | 137.2s | 2.3s |

`withBlockIds` is exported, so a bulk migration can do the same work once at rest.

`onChange` no longer serialises the whole document on every keystroke. It was serialising first and debouncing only the delivery, which is exactly what the debounce exists to avoid; the document is now serialised inside the timer. `onChangeImmediate` still gets it every time, because that is what it is for.

`BLOCK_NODE_TYPES` moved from `extensions` to `constants`. It is exported from the same places, so nothing an importer can see has changed.

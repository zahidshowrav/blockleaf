---
'@blockleaf/editor': minor
---

Word and character count, in `@blockleaf/editor/toc`. Put `<TextCount />` inside `BlockleafEditor` for a footer reading "412 words · 2,380 characters", or "12 of 412 words" for a selection. `useTextCount(editor?)` returns `{ words, characters, selection }` for your own display, and `countText(doc)` counts stored JSON. Words split the way the language does, through `Intl.Segmenter`, and each block's count is kept until it changes, so typing in a long document recounts one block. Nothing is stored. `BlockleafEditor`'s `children` can now reach the editor with Tiptap's `useCurrentEditor()`, and `useTableOfContents` uses it when given no editor.

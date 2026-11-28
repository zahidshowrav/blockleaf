# @blockleaf/editor

## 0.11.0

### Minor Changes

- bcea22e: Background colour for text: the `highlight` mark's `color` now takes a colour token. Stored hex, `rgb()` and `hsl()` values still render; any other value is no longer written into `style`.
- 520c078: Block background colour: a paragraph, heading, quote, list or toggle takes a colour token in `backgroundColor`, from the block menu's new Background group or `setBlockBackground`. In every preset; new in schema version 2.
- 6167d57: A caption toolbar, from `@blockleaf/editor/media`, with caption alignment and Remove caption. New: `createToggleCaptionAction(title)` and `labels.caption`.
- 8479f86: The schema and `./validate` know `mathInline` and `mathBlock`, new in schema version 2, and the slash menu has a Math item that shows when `@blockleaf/math` is loaded. Strings are under `labels.math`.
- 0ad1a1d: Embeds, from the new `@blockleaf/editor/embeds` subpath: YouTube, Vimeo, Loom, Spotify and CodePen in a frame, by pasting a link or with `/embed`. Only player addresses from that list are stored; new in schema version 2.
- f4b8327: Emoji, from the new `@blockleaf/editor/emoji` subpath: type `:` to pick one. Emoji are inserted as plain text, so nothing new is stored.
- b810f8e: Font family, from `@blockleaf/editor/text-style`: a new `fontFamily` mark with `setFontFamily` / `unsetFontFamily`. New in schema version 2.
- 8ac43bd: Font size, from `@blockleaf/editor/text-style`: a new `fontSize` mark with `setFontSize` / `unsetFontSize`. New in schema version 2.
- 0f5095c: Images can take a caption, with `toggleCaption()` and `setCaptionAlign()`. Stored as a `figure`, like a captioned table; new in schema version 2.
- f413487: Link preview cards, from `@blockleaf/editor/embeds`: `/preview` turns an `https:` link into a card with its title, description, site name and picture, which your `fetchLinkPreview` supplies. New in schema version 2.
- 5a05f62: Video, audio and file blocks, from `@blockleaf/editor/media`. Uploads go to the block for the file's type, and the default `uploadAccept` grows to match. Sources must be `https:` or relative; new in schema version 2.
- a173335: Resize images and videos, and set them to full width, from `@blockleaf/editor/media`. New commands `setMediaWidth(width)` and `toggleMediaFullWidth()`; new in schema version 2.
- 10a117b: Mentions, from the new `@blockleaf/editor/mentions` subpath: `withMentions(extensions, { items })` inserts a `mention` node on `@`. `SCHEMA_VERSION` is now `2`: stored documents do not change, but an older editor opens a version 2 document read-only. Upgrade `@blockleaf/renderer` before the editor.
- 897531e: Subscript and superscript, from the new `@blockleaf/editor/text-style` subpath, through `withTextStyle(extensions)`. New in schema version 2.
- 9dd7ece: Table of contents block, from the new `@blockleaf/editor/toc` subpath, plus `useTableOfContents`, `getTableOfContents` and `goToHeading`. New in schema version 2.
- acbe2a0: Text alignment for paragraphs and headings, with `setTextAlign` / `unsetTextAlign` from `withTextStyle`. New in schema version 2; `onChange` now leaves out attributes whose value is `undefined`.
- 9cc3941: Text colour, from `@blockleaf/editor/text-style`: a new `textColor` mark with `setTextColor` / `unsetTextColor`. New in schema version 2.
- 280a25f: Word and character count, from `@blockleaf/editor/toc`: `<TextCount />`, `useTextCount()` and `countText(doc)`. Nothing is stored; `BlockleafEditor`'s children can now use Tiptap's `useCurrentEditor()`.

### Patch Changes

- dd548dd: Pasting into selected table cells no longer gives the repeated cells the same block ids.
- c112d81: Doc comments in the type files no longer mention internal tracking ids.

## 0.10.0

### Minor Changes

- 2299442: A print stylesheet, so Save as PDF gives a clean document. Dark theme now applies on screen only.
- c6149b6: A toggle block, from **Toggle** in the slash menu, stored as the existing `details` node. `SCHEMA_VERSION` stays `1`; new exports `Details`, `DETAILS_NODE` and `DetailsLabels`.

## 0.9.0

### Minor Changes

- f3b8165: Pasting a long document is much faster: five thousand blocks now take under two seconds, down from 20. New `PastedBlockIds` extension and `isPasteTransaction` export; stored documents do not change.

## 0.8.0

### Minor Changes

- 80bd590: A table can have a caption, with `toggleTableCaption()`. Stored as new `figure` and `caption` nodes; `SCHEMA_VERSION` stays `1`.

## 0.7.0

### Minor Changes

- f55edd9: New `migrate()` brings a stored document up to the current `SCHEMA_VERSION`. Call it before `setContent()`, server-side validation and rendering; the stored shape does not change.

## 0.6.0

### Minor Changes

- 4344313: A document written by a newer editor now opens read-only too. `incompatibleDocument` accepts `'throw'`, and `IncompatibleDocumentError` is exported.
- b332a3c: A document the editor cannot read now opens read-only instead of empty, so a save cannot overwrite it; `incompatibleDocument: 'discard'` opts out. Tiptap's content check is now on by default, so `setContent` can throw.
- cc7933e: An unknown node or mark now opens as a placeholder and is kept exactly as stored, instead of locking the document. New `UnknownContent`, `wrapUnknownContent` and `unwrapUnknownContent`.
- f46ac4a: The validator now accepts node and mark types it does not define, and returns them unchanged. New `UnrecognisedNode` and `UnrecognisedMark` types; a walker needs a `default` branch.

### Patch Changes

- 729dae6: Autofocus no longer throws on Android, iOS and desktop Safari.

## 0.5.1

### Patch Changes

- 1c8c989: Styles the scrollable table box that `@blockleaf/renderer` outputs (`.blockleaf-table-scroll`).

## 0.5.0

### Minor Changes

- e5df470: A long document with no block ids opens much faster: ten thousand blocks in about two seconds, down from 137. New `withBlockIds` export, and `onChange` no longer serialises the document on every keystroke.

## 0.4.0

### Minor Changes

- 38dc0d1: Tables work better with screen readers and narrow screens: header cells get `scope`, the caret's cell is announced, and a wide table scrolls in its own region. Nothing stored changes; new labels under `table`.

## 0.3.0

### Minor Changes

- 27fffcc: Translate every string the editor shows through a single `labels` prop. The default registries are now functions of a label set, such as `createSlashCommands`.
- 1605175: The block menu now works on touch screens, and touch targets grow to 44px on a coarse pointer.

## 0.2.0

### Minor Changes

- e2a4dd6: An uploaded image always gets alt text: `UploadResult` takes `alt`, and falls back to the file name. An empty string is kept, marking the image decorative.

### Patch Changes

- da5329e: The block menu is now in the tab order, so a keyboard user can scroll it.

## 0.1.2

### Patch Changes

- c9c8638: A task item's text now lines up with its checkbox.

## 0.1.1

### Patch Changes

- 9faaa12: The upload placeholder no longer rebuilds on every progress tick, so a click on Cancel is not lost.

## 0.1.0

### Minor Changes

- c8a31a2: An Image item in the slash menu, shown only when an `upload` adapter is set. `SlashCommand` gains `isAvailable`.

## 0.0.9

### Patch Changes

- cc50bbd: The block menu is no longer clipped by a scrolling container. It now renders on `document.body`, so style `.blockleaf-block-menu` directly.

## 0.0.8

### Patch Changes

- 7dc27ac: The slash menu's arrow keys now move to the row above or below.

## 0.0.7

### Patch Changes

- 7c1bbcb: The drag handle now appears beside its block. `--bl-handle-gap` is removed.

## 0.0.6

### Patch Changes

- dfbc49d: The chrome no longer throws when an extension it offers, such as highlight or tables, is not loaded.
- f254f17: Task list items render inline, and list markers survive a CSS reset.

## 0.0.5

### Patch Changes

- b6f7882: Add the upload adapter interface: hosts implement `UploadAdapter`, and `isUploadResult` checks what it returns.
- 05657cb: Upload files by drop, paste or `openUploadPicker`, checked for type and size first. New options: `upload`, `uploadAccept`, `uploadMaxBytes` and `onUploadError`.
- 5fa4e4c: Uploads show progress and a Cancel button, and a failed upload offers Retry and Dismiss.
- a114e5d: Image block with alt text and alignment; `src` is sanitised in the schema. Renamed CSS classes: `blockleaf-bubble-menu__link-editor`, `__link-input` and `__link-error` are now `__panel`, `__panel-input` and `__panel-error`.
- c004dfe: Syntax-highlighted code block with a language picker, from the opt-in `@blockleaf/editor/code-block` subpath (`withCodeBlock`). Stored documents do not change.

## 0.0.4

### Patch Changes

- d4ee34a: Slash command menu with full keyboard and accessibility support.
- e44eabb: Selection bubble menu with mark toggles and a link editor.
- 7f1cbc8: Drag handle and block menu.
- 5f8e57e: Placeholder text, and no empty paragraph appended after a heading.
- 5efe7d3: Keyboard-complete, axe-clean chrome. New `label` prop names the editing surface, and new shortcuts open the block and table menus.
- 67a6702: Choosing Table in the slash menu opens a grid-size picker. Slash commands can carry a `picker`.
- b40815c: Row and column handles in tables, each with a menu of structure actions.
- d1f6727: A cell bubble menu for merge, split and structure actions on a cell selection.
- 23952c5: Fix `pnpm dev` leaving the sandbox unable to resolve `@blockleaf/editor`.

## 0.0.3

### Patch Changes

- 8e6a8c8: Export `BlockleafNode` and `BlockleafMark` union types for the schema.
- 32d55f2: Add callout, task list, highlight, underline and sanitised link extensions to the minimal and standard presets.
- c15f81e: Add stable block ids through the UniqueID extension.
- 00b273e: Add Markdown input rules for headings, lists, blockquotes, callouts (`:::`), marks and sanitised links.
- 1243e38: Add keyboard shortcuts for every node and mark.
- f42a550: Sanitise pasted HTML and handle pasted Markdown text.
- c8bb06d: Add a schema snapshot test to catch accidental shape changes.
- e19816e: Export the `TableCellContentNode` type for table cells and headers.
- e0d61c8: Add tables to the standard preset.
- 8e6559d: Add the `insertTable` command, the `Mod-Alt-t` shortcut and the `|||` input rule.
- 880c0a9: Test the table row, column and header commands.
- d350b3b: Test the table cell merge and split commands.
- 550813e: Table cell navigation and list indentation keys work together.
- f05eaf2: Normalise pasted tables from HTML, Google Docs, Word and Markdown, flattening nested tables.
- 011304d: Add a table round-trip test and schema snapshot.
- d9d74ec: Document validation from `@blockleaf/editor/validate`, with zod as an optional peer dependency.
- efbd920: Add a Playwright browser test setup.

## 0.0.2

### Patch Changes

- 46f8c2d: Raise the bundle size ceiling from 130 kB to 160 kB. The schema-only budget stays at 2 kB.

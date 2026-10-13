# @blockleaf/editor

## 0.0.5

### Patch Changes

- b6f7882: Add the upload adapter interface (MC-01). Hosts implement `UploadAdapter` and
  the editor drives it; no storage provider is baked in. The second argument is a
  context object rather than a bare `AbortSignal` so adapters can report
  determinate progress, and `isUploadResult` validates what an adapter resolves
  with before it can reach the document.
- 05657cb: Add drop, paste and picker entry points for uploads (MC-02). Dropping files on
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
- 5fa4e4c: Add upload progress, cancel and retry (MC-03). The in-flight placeholder now
  shows a progress bar driven by the adapter's `onProgress`, with a Cancel
  button that aborts the request through the signal.
  
  Progress is indeterminate until an adapter reports a fraction — `fetch` cannot
  measure upload progress, so a bar claiming a percentage it does not have would
  be a lie. An indeterminate `progressbar` omits `aria-valuenow` rather than
  reporting zero.
  
  A failed upload no longer disappears. Its placeholder stays, holding the
  position it has been mapping all along, and offers Retry and Dismiss — so a
  retry puts the image where the user dropped it, even after editing above it.
  A cancelled upload is not reported as a failure.
- a114e5d: Add the image block with alt text and alignment (MC-04). The node is
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
- c004dfe: Add the syntax-highlighted code block with a language picker (MC-05), as the
  new opt-in subpath `@blockleaf/editor/code-block`.
  
  ```ts
  import { createExtensions } from '@blockleaf/editor/extensions';
  import { withCodeBlock } from '@blockleaf/editor/code-block';
  
  const extensions = withCodeBlock(createExtensions('standard'));
  ```
  
  It is a subpath rather than part of the default build because `lowlight` and
  its grammars cost 16.53 kB and the default bundle had 15.37 kB left — shipping
  it by default put the editor at 161.16 kB, over the ceiling. Importing nothing
  costs nothing, and the main entry is unchanged at 144.63 kB. See F14.
  
  Seven grammars ship by default — bash, css, javascript, json, python,
  typescript and xml — and hosts register more through `additionalLanguages`.
  `StarterKit`'s plain code block is untouched for anyone who does not import
  the subpath, and the stored shape is identical either way.
  
  A code block whose language this host has not registered now renders
  unhighlighted instead of throwing during editor construction, and keeps its
  `language` attribute rather than having it stripped on the next save.

## 0.0.4

### Patch Changes

- d4ee34a: Implement slash command menu backed by command registry with full keyboard and accessibility support (CH-01)
- e44eabb: Add the selection bubble menu with a link editor (CH-02). Six mark toggles with
  ARIA toolbar keyboard navigation, and an href field that mirrors the schema's
  sanitisation so a rejected link says why.
- 7f1cbc8: Add the drag handle and block menu (CH-03). Hand-rolled rather than using
  `@tiptap/extension-drag-handle`, which imports yjs at module scope and costs
  32.87 kB; this costs 1.83 kB and no new dependency.
- 5f8e57e: Add the placeholder and configure the trailing node (CH-04). The placeholder is
  a hand-rolled decoration plugin — `@tiptap/extensions` declares no
  `sideEffects`, which pushed the schema-only entry from 136 B to 60.77 kB.
  StarterKit's `trailingNode` no longer appends an empty paragraph after a
  heading, and a saved document that needs a trailing paragraph gets one on load
  without reporting it as a user edit.
- 5efe7d3: Make the chrome keyboard-complete and axe-clean (CH-05). Adds a `label` prop
  giving the editing surface an accessible name, `Shift+F10` and `Mod+Alt+M` for
  the block menu, `Mod+Alt+R` / `Mod+Alt+C` for the table menus, and fixes a
  colour-contrast failure on selected menu rows. The link editor now wins focus
  reliably, including when `Mod+K` is pressed before the toolbar has appeared.
- 67a6702: Add the table grid-size picker to the slash menu (CH-06). Choosing Table now
  opens an 8 × 8 grid driven by pointer or arrow key, calling the `insertTable`
  command from EC-13. Slash commands can carry a `picker` for any command that
  needs an argument.
- b40815c: Add in-table row and column handles (CH-07). Each opens a menu of structure
  operations calling the EC-14 and EC-15 commands, and asks those commands
  whether they can run rather than re-deriving availability.
- d1f6727: Add the in-table cell bubble menu (CH-08). A second bubble menu instance with
  its own plugin key and `shouldShow`, offering merge, split and structure
  operations for a selection spanning cells. The text bubble menu stands down
  for a cell selection so the two never compete.
- 23952c5: Fix `pnpm dev` leaving the sandbox unable to resolve `@blockleaf/editor`. The
  stylesheet is now copied by the bundler rather than the `build` script, so
  watch mode emits it too, and `clean` no longer wipes `dist/` when the watcher
  starts. The published `./styles.css` subpath is unchanged.

## 0.0.3

### Patch Changes

- 8e6a8c8: Export discriminated union `BlockleafNode` and `BlockleafMark` types corresponding to the v0.1 schema.
- 32d55f2: Add callout, task list, highlight, underline, and sanitised link extensions to minimal and standard presets.
- c15f81e: Add UniqueID extension across block nodes for stable block IDs (EC-05).
- 00b273e: Add markdown input rules for headings, lists, blockquotes, callouts (`:::`), marks, and sanitised markdown links (EC-06).
- 1243e38: Add complete keyboard shortcuts across every node and mark in the editing core (EC-07).
- f42a550: Add paste normalisation for HTML sanitisation and markdown plain-text paste handling (EC-08).
- c8bb06d: Add canonical schema snapshot fixture and tests to prevent accidental shape changes (EC-10).
- e19816e: Export strict non-nestable TableCellContentNode type for table cells and headers in schema (EC-11).
- e0d61c8: Integrate TableKit from @tiptap/extension-table with non-resizable schema in standard preset (EC-12).
- 8e6559d: Add insertTable command and keyboard insertion path via Mod-Alt-t shortcut and ||| input rule (EC-13)
- 880c0a9: Verify and test table structure commands (addRowBefore, addRowAfter, deleteRow, addColumnBefore, addColumnAfter, deleteColumn, toggleHeaderRow, deleteTable) (EC-14)
- d350b3b: Verify and test table cell merge, split, and mergeOrSplit commands (EC-15)
- 550813e: Verify and coordinate table cell navigation (Tab, Shift-Tab, arrows) and list indentation keymaps (EC-16)
- f05eaf2: Normalise pasted tables from HTML, Google Docs, Word, and markdown plain-text, flattening nested tables (EC-17)
- 011304d: Add table document round-trip test and schema snapshot fixture (EC-18)
- d9d74ec: Export deep document schema validation from @blockleaf/editor/validate subpath with optional zod peer dependency (EC-19)
- efbd920: Configure Playwright browser test harness and e2e smoke spec against sandbox (EC-20)

## 0.0.2

### Patch Changes

- 46f8c2d: Raise the bundle ceiling from 130 kB to 160 kB. Measured, not guessed: tables cost 11.74 kB and `lowlight` costs 16.69 kB curated or 39.27 kB with the `common` grammar set. The schema-only budget is unchanged at 2 kB.

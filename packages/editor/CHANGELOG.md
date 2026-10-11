# @blockleaf/editor

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

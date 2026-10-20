---
'@blockleaf/editor': minor
---

Translate the chrome through a single `labels` prop.

Every string the editor and its default menus render now comes from one typed label set, grouped by surface — `blockTypes`, `slashMenu`, `bubbleMenu`, `blockMenu`, `table`, `image`, `link`, `upload`, `codeBlock` and `placeholder`. Anything a host leaves out keeps its English default at every level, so a partial translation is a valid one, and a misspelled key is a compile error rather than a silently English menu item.

`blockTypes` names each block once: the slash menu's items and the block menu's "Turn into" group both read from it, so the two cannot drift apart.

Each default registry is now a function of a label set — `createSlashCommands`, `createBubbleActions`, `createBlockActions`, `createTableActions`, `createCellActions`, `createImageActions` — and the `default*` arrays are those functions called with the English defaults, unchanged. `resolveBubbleActions`, `resolveBlockActions` and `resolveTableActions` take an optional second argument for the defaults an override builds on.

`PlaceholderLabels` and `defaultPlaceholderLabels` now live in `src/core` with the rest; they are still exported from the same places.

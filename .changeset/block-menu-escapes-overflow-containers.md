---
'@blockleaf/editor': patch
---

Stop the block menu being clipped by the container the editor is in.

It rendered inside the handle, so an ancestor with `overflow: auto` — which is
how most hosts give an editor a fixed height — cut it off, and because an
absolutely positioned descendant still counts towards a scroll container's
`scrollHeight`, opening it lengthened the scrollbar and shifted the content
underneath.

The menu now renders in a portal on `document.body`, positioned `fixed`
against the handle's viewport rect. It flips above the handle when there is no
room below, follows the handle on scroll and resize, and closes when a press
lands outside it — which also stops it sitting open behind the slash menu.

Two things change for anyone styling it. It is no longer a descendant of the
editor wrapper, so target `.blockleaf-block-menu` directly; and like the slash
menu it carries `data-theme` across but cannot inherit `--bl-*` properties set
on the wrapper.

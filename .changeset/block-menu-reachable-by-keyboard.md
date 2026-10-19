---
'@blockleaf/editor': patch
---

Put the block menu in the tab order.

The menu is a scroll container that was only focusable in script, so a keyboard user could reach its items through the menu's own arrow handling but had no way to scroll to the ones below the fold. It is now tabbable; `aria-activedescendant` still drives what is announced.

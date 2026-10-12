---
'@blockleaf/editor': patch
---

Make the chrome keyboard-complete and axe-clean (CH-05). Adds a `label` prop
giving the editing surface an accessible name, `Shift+F10` and `Mod+Alt+M` for
the block menu, `Mod+Alt+R` / `Mod+Alt+C` for the table menus, and fixes a
colour-contrast failure on selected menu rows. The link editor now wins focus
reliably, including when `Mod+K` is pressed before the toolbar has appeared.

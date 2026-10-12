---
'@blockleaf/editor': patch
---

Add the table grid-size picker to the slash menu (CH-06). Choosing Table now
opens an 8 × 8 grid driven by pointer or arrow key, calling the `insertTable`
command from EC-13. Slash commands can carry a `picker` for any command that
needs an argument.

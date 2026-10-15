---
'@blockleaf/editor': patch
---

Fix the slash menu's arrow keys selecting a different row than the one they
move to.

The list renders grouped by `group`, but `ArrowDown` and `ArrowUp` stepped
through the flat `items` array. The default registry declares commands
interleaved across groups, so the two orders disagreed and the highlight
jumped: from Text it went to Heading 1, ran down to To-do list, then back up
to Quote, Code, Callout and Divider before reaching Table. `Enter` then ran
whichever command that index happened to hit.

Selection now indexes the same order the rows are rendered in, so `↑` and `↓`
move to the row above and below, and wrapping goes from the last row to the
first.

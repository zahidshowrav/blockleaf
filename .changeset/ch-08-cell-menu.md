---
'@blockleaf/editor': patch
---

Add the in-table cell bubble menu (CH-08). A second bubble menu instance with
its own plugin key and `shouldShow`, offering merge, split and structure
operations for a selection spanning cells. The text bubble menu stands down
for a cell selection so the two never compete.

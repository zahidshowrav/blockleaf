---
'@blockleaf/editor': minor
---

Make the block menu reachable on a phone.

A touch device never fires `mousemove`, so a drag handle that appears on hover never appears at all — and every block action went with it. On a coarse pointer the handle now follows the caret instead of the pointer: tap into a block and it is beside that block, tap its grip and the menu opens. The pointer is watched rather than read once, so a laptop with a touchscreen behaves as whichever the reader last used, and a mouse is unaffected.

A touch press on the handle no longer blurs the editor. It used to take the caret away before the click landed, which unmounted the handle under the finger and sent the tap to the page behind it. Mouse presses are untouched, because preventing their default would also stop `dragstart`.

Under `@media (pointer: coarse)` the handle, the bubble menu's buttons and the slash, block and table menu rows grow to 44px. WCAG 2.5.8's 24px was already met; 24px is a floor, not a thumb.

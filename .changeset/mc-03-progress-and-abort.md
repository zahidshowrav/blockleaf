---
'@blockleaf/editor': patch
---

Add upload progress, cancel and retry (MC-03). The in-flight placeholder now
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

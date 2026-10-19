---
'@blockleaf/editor': patch
---

Keep the upload placeholder's element across progress ticks instead of rebuilding it.

The widget decoration was keyed on the progress value, so every tick — up to one every 60ms — destroyed the placeholder's DOM and built a new one, Cancel button included. A click already on its way to that button lost its target. The key now carries only the placeholder's shape, uploading or failed, and a tick moves the existing bar in place.

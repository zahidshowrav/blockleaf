---
'@blockleaf/editor': patch
---

Add the upload adapter interface (MC-01). Hosts implement `UploadAdapter` and
the editor drives it; no storage provider is baked in. The second argument is a
context object rather than a bare `AbortSignal` so adapters can report
determinate progress, and `isUploadResult` validates what an adapter resolves
with before it can reach the document.

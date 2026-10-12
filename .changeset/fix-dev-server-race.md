---
'@blockleaf/editor': patch
---

Fix `pnpm dev` leaving the sandbox unable to resolve `@blockleaf/editor`. The
stylesheet is now copied by the bundler rather than the `build` script, so
watch mode emits it too, and `clean` no longer wipes `dist/` when the watcher
starts. The published `./styles.css` subpath is unchanged.

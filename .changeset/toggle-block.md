---
'@blockleaf/editor': minor
---

A toggle block (`PA-01`). **Toggle** in the slash menu wraps the current block in a toggle. That block becomes its title, and the blocks after it are the body. A button beside the title opens and closes it, and so does `Mod+Enter` anywhere inside it. Enter at the end of a closed title starts a block after the toggle, and Backspace at the start of the title turns the toggle back into its blocks.

It is stored as the `details` node the schema has documented since `0.1.0`: `open`, plus its blocks, with the first block as the title (`F23`). `SCHEMA_VERSION` stays `1` and nothing migrates. New exports: `Details`, `DETAILS_NODE` and the `DetailsLabels` type. New labels: `blockTypes.toggle`, `slashMenu.descriptions.toggle` and `details.toggle`. `ToggleIcon` is exported with the other slash menu icons.

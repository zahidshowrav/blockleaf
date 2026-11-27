# Open flags

Decisions and unknowns that need the developer, not the next commit. Each one
names what is blocked, so a flag either gets answered or gets closed as
deliberately deferred — it does not sit here as a vague worry.

Flags are referenced by id from [`progress-tracker.md`](./progress-tracker.md). Resolve one by
recording the decision inline and moving it to **Settled**, rather than deleting
it; the reasoning is worth more later than the tidiness is now.

**Open:** none · **Settled:** F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24, F25, F26, F27, F28, F29, F30, F31, F32 · **Last reviewed:** 2026-11-25

---

## Settled

### F32 — what a block's background colour stores, and on which blocks · decided 2026-11-25

`PA-23` gives a block a background colour. It is the one `PA` change that
adds an attribute to nodes that already exist, so the shape was decided by
the developer before it was built.

**Decisions:**

- **`backgroundColor`, a token** (`F18`), named for what it is rather than `tone`: a callout's `tone` is a free string such as `info` with no colour behind it, and one name meaning two things would be worse than two names. A table cell's background (`TB-04`) uses the same name.
- **On the text blocks only**: `paragraph`, `heading`, `blockquote`, `bulletList`, `orderedList`, `taskList` and `details`. Not `callout`, which is already a coloured box; not `codeBlock`, which has its own background; not the table, whose cells get theirs in `TB-04`; not media. A list is coloured whole: the block menu acts on top-level blocks.
- **The text background palette**, drawn through `--bl-highlight-<token>`, so one colour looks the same on a word and on a block in either theme, and a host retheming one changes both.
- **In every preset, with the command**, for `F25`'s reason: an editor drops an attribute it does not know. The block menu, which is core chrome, sets it; no subpath is involved.
- **Absent when unset**, as `textAlign` is (`undefined`, not `null`), so a version 1 document opened and saved unedited is unchanged. It joins version 2 with no new bump.
- **The block menu's palette is copied onto it**: the menu is portalled to `document.body`, outside the editor, so its swatches would otherwise have no colours.

### F31 — what a link preview card stores, and who fetches it · decided 2026-11-25

`PA-16` adds `linkPreview` to `./embeds`: any link shown as a card with the
page's title, description, site name and picture.

**Decisions:**

- **`linkPreview { id, url, title, description, image, siteName }`, with the text stored.** A card is drawn from the document alone, by the editor and by the renderer, so a published page never waits on, or breaks with, someone else's site. The cost is that a card goes stale if the page changes; a host that cares can fetch again and update it.
- **`url` is `https:` only**, on top of the link rule. A card is a promise that there is a web page behind it; `mailto:` and relative links stay ordinary links. `image` follows the image rule.
- **The host fetches, through `fetchLinkPreview(url, { signal })`.** A browser cannot read another origin's page, and a library that shipped a fetching proxy would be shipping a server. It is called once per card added without a title, by the card's id; the result is cleaned (whitespace collapsed; title 300, description 500, site name 100 characters) and is not an undo step.
- **Where nothing is stored, the card shows the host name**, marked `data-fallback` so reading the HTML back stores nothing rather than the host name.
- **Only from the slash menu.** A pasted link stays a link; turning every pasted link into a card would surprise more people than it helps. Pasting a provider link on its own line still embeds it (`F30`).
- **Shares the media chrome**: captionable, with the media toolbar's caption and delete buttons. A figure counts a card with a `url` as a block worth keeping, as it does a picture with a `src`.
- **Renderer**: built in, inside the 4.25 kB set in `F30`.

### F30 — what an embed stores, and which sites it may show · decided 2026-11-25

`PA-15` adds `embed` to a new `./embeds` subpath: a frame showing another
site's player. A frame is the `href` risk with a page attached, so the
decision is mostly about what the schema lets through.

**Decisions:**

- **`embed { id, src, width, align }`, with `src` the provider's player address.** Not the page that was pasted, and no separate `provider` field that could disagree with it. The pasted page is turned into a player address once, on the way in (`toEmbedSrc`), by rebuilding it from the id, so stray parameters such as `autoplay` never get through.
- **A fixed provider list in the schema: YouTube, Vimeo, Loom, Spotify, CodePen.** Each is one whole-address pattern on the provider's player host. The editor's node, the validator and the renderer all check it; the renderer keeps its own copy (`F15`) and a shared table of vectors holds the two together. A host cannot add a provider: a frame the renderer and the validator do not know is exactly what the list exists to refuse. Adding one is a library change.
- **YouTube plays from `youtube-nocookie.com`.** No cookies until someone presses play.
- **The frame is sandboxed** to scripts, same-origin, popups and presentation, lazy-loaded, with `strict-origin-when-cross-origin` as its referrer policy, which YouTube's player now needs.
- **In the editor, a click selects the block.** An unselected frame ignores the pointer and the editor selects the block under it; a selected one takes clicks, so its player works.
- **It shares the media chrome.** Captionable, resized like a video (`F21`), with the media toolbar. `withEmbeds` and `withMedia` both add the toolbars and resizing, and each removes the other's copy first.
- **The renderer renders it, built in.** It took both renderer budgets past 3.5 kB. With the link preview card still to come, both are now 4.25 kB (decided 2026-11-25), for the reason `F29` gave: a stored block must never silently vanish from a published page.
- **Why:** the list is the security boundary, so it lives where every reader of a document checks it, not only where documents are written.

### F29 — what video, audio and a file store · decided 2026-11-24

`PA-12` to `PA-14` add three blocks to the `./media` subpath. Each is a new
node type in version 2, an atom, and in the `captionable` group (`F28`).

**Decisions:**

- **`video { id, src, poster, width, align }`.** The image's shape, so the same toolbar and, in `PA-24`, the same resize apply. `poster` is a still, held to the image rule.
- **`audio { id, src, title }`.** The title is the player's accessible name; without one, a page of players is "audio, audio, audio". An upload titles it from the file name, as an image's `alt` is.
- **`attachment { id, src, name, size, mime }`.** Named `attachment`, not `file`, so stored JSON never reads like a browser `File`. The name, the size in bytes and the type are stored because the block shows them before anyone fetches the file. In the editor a click selects the block and never opens the file.
- **Sources: `https:` or relative, and no `data:` URL of any kind.** The image rule allows raster data URLs because a clipboard image arrives as one. A video or a PDF never does; megabytes of base64 in a document cost every host; and a `data:` link is a way to serve HTML from the host's origin. The renderer carries the same rule (`F15`), and its tests run both copies over one table.
- **Uploads go to the block for the file's type**: `image/*`, `video/*`, `audio/*`, then anything else to a file block, each only if its block is loaded. Left at its default, the upload's `accept` follows what is loaded; a host's own `accept` is used as given.
- **The renderer renders all three, built in.** It costs 0.44 kB on each target and took both past 3 kB, so both budgets are now 3.5 kB (decided 2026-11-24). An opt-in renderer subpath was the alternative and was turned down: a renderer that silently drops a stored video from a published page is worse than the weight.
- **Why:** each block stores what it needs to be drawn without a fetch, and nothing that a screen or a session would make wrong.

### F28 — which blocks a figure may caption · decided 2026-11-24

`HD-10` gave tables a caption as `figure > table caption` (`F20`). `PA-20`
gives images one, and `PA-12` to `PA-15` will add video, audio, files and
embeds, which ship in subpaths. The figure lives in the core, so its content
expression cannot name `video`: ProseMirror refuses to build a schema whose
expression names a node the editor did not load.

**Decisions:**

- **A node group, `captionable`.** The figure's content is `(table | captionable) caption`. `image` is in the group in the core; each media block joins it from its subpath. The core never names them.
- **`table` stays named.** It belongs to the table kit, whose group the core does not set, and it was the first captioned block.
- **The caption's own alignment is `textAlign`**, the attribute every preset already carries for paragraphs (`F25`), not a new one. Absent, the stylesheet makes it follow its block's alignment, so a centred image does not get a left-hand caption.
- **In version 2.** An editor that only knows version 1 refuses an image inside a figure (it is a known node with content it does not allow, not an unknown one it could keep as a placeholder). Version 2 is unreleased, so this joins it; no new bump.
- **Deleting the block deletes the caption.** As for tables: a figure left with only a caption is removed.
- **Why:** one caption mechanism, open to blocks the core does not ship, with no change to how a table caption is stored.

### F27 — what a table of contents stores · decided 2026-11-23

`PA-08` adds a table of contents. It can be a block the writer places, or a
list worked out from the headings and drawn outside the document.

**Decisions:**

- **Both.** A `tableOfContents` block, and the list it shows, exported for
  a host's own sidebar: `useTableOfContents` and `getTableOfContents` in
  `@blockleaf/editor/toc`, `tableOfContents` in `@blockleaf/renderer`.
- **The block stores nothing but its id.** Entries are worked out from the
  headings every time it is drawn, so it can never be stale, and renaming a
  heading never changes a second node.
- **Every heading with text, in order**, inside callouts, toggles and cells
  too. Indented by `depth`, counted from the highest level the document
  uses, so a page starting at Heading 2 does not open indented.
- **Links are `#<block id>`.** The editor moves the caret on a click. The
  renderer gives headings an `id` to jump to, but only in a document with a
  table of contents block: block ids are `data-id` everywhere else, and
  every existing document renders exactly as before.
- **`getHTML` writes an empty `nav`.** A node's `renderHTML` sees only that
  node, so the editor cannot list the headings there. The renderer fills it
  in; that is the one difference from the editor, and its parity tests say
  so.
- **The renderer passes `root` to every node renderer**, the document being
  rendered. Additive; the table of contents is its first user.
- **Rejected: storing the entries.** A snapshot goes stale the moment a
  heading is renamed, and every heading edit would rewrite a second block.
- **Rejected: always writing heading `id`s.** Useful for deep links, but it
  changes every rendered page, and two copies of a document on one page
  would repeat the ids.

### F26 — one mark per text style · decided 2026-11-23

`PA-05` adds text colour, and `PA-10` and `PA-11` will add font family and
size, all stored as tokens (`F18`). Tiptap keeps all three as attributes on
one `textStyle` mark.

**Decisions:**

- **A mark of its own for each:** `textColor` now, `fontFamily` and
  `fontSize` later. An editor keeps a mark it does not know but drops an
  attribute it does not know (`F25`), so a shared mark would have meant
  `PA-10` and `PA-11` adding attributes that an editor from before them
  strips on save. Separate marks never change once shipped.
- **`textColor` stores `{ color }`, a token:** lower case, a letter first,
  at most 32 characters. The nine built in — gray, brown, orange, yellow,
  green, blue, purple, pink, red — have light and dark values in the
  stylesheet, each at least 4.5:1 on its background. A host may use any
  other token and define `--bl-text-<token>` itself.
- **Rendered as `style="color: var(--bl-text-<token>, currentColor)"`** in
  the editor and both renderer targets, plus `data-color`. A host token
  needs only its custom property, no selector; an undefined one falls back
  to the text colour rather than to nothing. The token is checked before it
  reaches `style`, everywhere it is read.
- **Rejected: one `textStyle` mark.** Fewer types and Tiptap's own shape,
  but every later style would change a shipped mark.

### F25 — where text alignment lives · decided 2026-11-23

`PA-06` adds `textAlign` to paragraphs and headings. It is the first
version 2 change that is an attribute on an existing node rather than a new
type, and that matters: an editor keeps an unknown node or mark as a
placeholder, but it drops an unknown attribute.

**Decisions:**

- **The attribute is in the core schema, in every preset.** An editor that
  skipped `@blockleaf/editor/text-style` would otherwise strip alignment
  from every block it saved. The attribute costs a few hundred bytes in the
  main bundle; losing an author's formatting silently costs more.
- **The commands, shortcuts and block-menu entries are in the subpath.**
  `setTextAlign`, `unsetTextAlign` and `Mod-Shift-L`, `E`, `R`, `J` come with
  `withTextStyle`. The block menu's Align group is in the default chrome but
  only appears where those commands exist.
- **Four tokens or nothing:** `left`, `center`, `right`, `justify`. No CSS
  value is stored (`F18`), and a pasted `text-align: start` reads as
  nothing. Nothing means the language's own direction, which is what a
  right-to-left document needs.
- **Unaligned stores nothing.** The attribute defaults to `undefined`, not
  `null`, so an unaligned block's JSON is byte for byte what it was before
  version 2 — no `"textAlign": null` on every paragraph of every document.
  `onChange` drops `undefined` attributes, so the object a host is handed
  matches what it stores.
- **Choosing the alignment a block already has takes it off**, from the
  shortcut or the menu. There is no separate "reset" control to find.
- **Rejected: attribute in the subpath.** Smallest main bundle, but an
  editor without the subpath loses alignment on save, and no warning in the
  docs makes that safe.

### F24 — what a stored mention carries · decided 2026-11-22

`PA-02` opens the batch that moves the schema to version 2. Changing a
mention's attributes later would cost another bump, so they are settled
before anything is stored.

**Decisions:**

- **`{ id, label, kind }`.** `id` is the host's own key and Blockleaf never
  reads it. `label` is the name at the time it was mentioned, so the
  renderer can show something without asking the host. `kind` is an
  optional string — `'user'`, `'page'` — so one document can mention more
  than one sort of thing without another bump. Blockleaf gives `kind` no
  meaning of its own.
- **`data-mention-id` in HTML, not `data-id`.** `data-id` is a block's id
  everywhere else in the editor and the renderer. The editor still reads
  `data-id` on a pasted mention, because that is what other editors write.
- **The text is `@` and the label, whatever the kind.** It is what a
  copied mention pastes as and what `toPlainText` returns. A host that
  wants pages to look different styles `[data-kind]`.
- **The node is in the schema from version 2, the editor loads it from
  `@blockleaf/editor/mentions`.** An editor without the subpath keeps a
  stored mention as a placeholder and saves it back unchanged.
- **Version 2 carries the whole `PA-02` to `PA-11` batch.** The migration
  from 1 changes nothing — every version 1 document is a valid version 2 one
  — and the later tasks in the batch add to version 2 before it is
  released, without bumping again.
- **Rejected: `id` only.** No stale names, but the renderer would have
  nothing to show for a mention without the host's help, and a server
  rendering a page would need a lookup per mention.
- **Rejected: `id` and `label` only.** Tiptap's own shape, but a second sort
  of mention would mean another bump.

### F23 — where a toggle's title lives · decided 2026-11-22

`details` has been in the schema since `0.1.0` as `{ open, id }` and a list
of blocks, with no title field and no editor extension behind it. Both
renderer targets wrote a bare `<details>`, so a browser showed its own
"Details" label. `PA-01` adds the editor extension, and a toggle needs a
title someone can type and click.

**Decisions:**

- **The first block inside `details` is its title.** The blocks after it are
  the body that opens and closes. No new node, no new attribute, no
  `SCHEMA_VERSION` bump, no migration — the stored shape is the one already
  documented.
- **The renderer wraps that first block in `<summary>`.** That is a change in
  output, not in what is stored: a document built by hand that already uses
  `details` now shows its first block as the title. Nothing the editor
  wrote is affected, because the editor could not write a `details` before.
- **Rejected: a separate `detailsSummary` node.** It is the shape Tiptap's
  own details extension uses and it makes the title explicit, but it changes
  the stored shape. That would have moved `PA-01` into the held v2 batch
  instead of the early release (decided 2026-11-22).
- **Content stays `block+`, like `callout`.** The title can be any block the
  document allows. Narrowing it to a paragraph or heading in the editor would
  make a valid stored document fail to open.

### F22 — may a column width written by a drag be stored · decided 2026-11-10

§3.1 of the plan admitted tables to `0.1` with a list of what was not admitted
with them, and "column resizing persisted as layout" is on it. The same
section admitted `colwidth` because ProseMirror's table implementation
expects it, so the field has been in the schema, in `./validate`, in the
snapshot and in both renderer targets since `0.1.0`. The editor passed
`resizable: false`, so nothing wrote to it. `TB-01` writes to it. That is the
whole change: no new attribute, no `SCHEMA_VERSION` bump, no migration.

**Decisions:**

- **Allowed.** A dragged column width is stored in `colwidth`, in pixels, as the field has always been defined.
- **Exact on every screen, phone included.** The editor and `@blockleaf/renderer` show the stored width; neither squeezes a column to fit. A table wider than its container scrolls sideways inside its wrapper, which `HD-08` and `HD-12` already built.
- **Reversible in one command.** `TB-07` writes the field back to `null` on every cell, so the table returns to equal columns.
- **Not a precedent.** The table's own full width (`TB-08`) stores a named value, as `F21` chose for images, never a pixel count measured on the author's screen. No other node gains a layout attribute without the same argument being made in public.
- **Why:** the field exists and is honoured on every output already; refusing to write it kept the document no cleaner, it only kept a feature out. Reversing the §3.1 note here makes the reversal deliberate rather than by drift, as the table's own admission was.

### F21 — what an image resize is allowed to change · decided 2026-11-07

Resizing media blocks (images, videos, YouTube/Vimeo embeds, iframes) resizes
**width while locking the aspect ratio**, plus provides a 1-click **full-width** toggle (`PA-24`).

**Decisions:**

- Width is resized smoothly with aspect ratio maintained; arbitrary height distortion (squishing/stretching) is strictly refused.
- Applies across all media types: image, video, embeds (YouTube, Vimeo), and general iframes.
- Full width is a named state/class rather than a raw pixel width, ensuring responsive rendering on mobile and varied screen sizes.
- Image cropping, if desired in the future, will be introduced as its own dedicated crop tool rather than a side-effect of resize handles.

**Built (`PA-24`, 2026-11-24):**

- **Stored as `width: number | "full" | null`** on `image` and `video`. Full width is the one named value, in the attribute that already held pixels, rather than a second attribute that could disagree with the first. `null` is the file's own size. Version 1 images keep the pixels or `null` they had.
- **A pixel width is drawn no wider than the page**, and never narrower than 64 pixels. On release, not while dragging: one drag is one undo step and one `onChange`.
- **The handles are an overlay, not a node view**, so the image keeps its markup and every selector on it. They are pointer-only and hidden from assistive technology; the keyboard has `Alt-Shift-Arrow` and the toolbar's Full width button.
- **A centred picture grows on both sides**, so the handle stays under the pointer.
- **In `./media`, not the core.** The core reads and draws `"full"`, so an editor without the subpath keeps and shows a stored width; it only cannot change one.

### F20 — is a caption plain text or rich text · decided 2026-11-07

Captions (under images, video, embeds, audio, and tables) are structured as **rich text**
(inline content holding text and marks such as links, emphasis, and strong).

**Decisions:**

- ~~A media/table block includes a `caption` child node~~ — amended 2026-11-20, see below.
- A captioned block is wrapped in a `figure` node holding the block and then a `caption` node with inline content: `figure > (table | image …) caption`. The block itself is stored exactly as it is without a caption.
- **Why the wrapper, amended 2026-11-20:** `prosemirror-tables` treats every child of a `table` as a row (`computeMap` takes `height = table.childCount`), so a `caption` inside the table reads as a broken row and every table command breaks on it. A wrapper leaves the table untouched. It also spares `PA-20` its hardest part: `image` stays `atom: true` and the caption sits beside it rather than inside it. `figure` and `caption` are new node types, so adding them moves no existing node and needs no migration.
- **The cost:** a reader that predates `figure` sees one unknown node where the captioned table was. An older editor keeps it as a placeholder and saves it back intact (`FC-03`); an older `@blockleaf/renderer` renders nothing for it (`FC-05`), so the whole table, not only its caption, is missing until the renderer is upgraded.
- Supports clickable links and formatting (essential for credits, source links, and licenses).
- Aligns `PA-20`, `PA-21`, and `HD-10` on the same structured caption mechanism.
- **Why:** Plain string attributes cannot express source/attribution links, which are present in almost all production captions. Storing rich text immediately prevents a breaking schema bump later when link credits are inevitable.

### F19 — what the editor's motion is built out of · decided 2026-11-07

The editor's motion and animation language is built entirely out of **pure CSS transitions and keyframes**.

**Decisions:**

- Motion uses CSS variables (`--bl-duration-*`, `--bl-ease-*`) and standard CSS keyframes/transitions.
- Drag-and-drop indicator snaps into position cleanly without requiring heavy runtime physics animation.
- No JavaScript animation libraries (e.g., Framer Motion) are bundled.
- Respects `prefers-reduced-motion` globally so all motion collapses to instant cuts when requested.
- **Why:** Keeps 0 kB runtime JS overhead against the strict 160 kB bundle budget, avoids breaking host stylesheets, and provides instant, predictable UI response.

### F18 — does a stored design value keep a token or a CSS value · decided 2026-11-07

Stored design values (text color, background color, font family, font size) store
**semantic tokens**, not raw CSS values.

**Decisions:**

- Font size stores named scale tokens (e.g., `"sm"`, `"md"`, `"lg"`), resolving via `--bl-font-size-*`.
- Font family stores semantic family tokens (e.g., `"sans"`, `"serif"`, `"mono"`), resolving via `--bl-font-*`.
- Colors store semantic theme tokens (e.g., `"muted"`, `"brand"`, `"accent"`), resolving via `--bl-*` custom properties.
- **Why:** Raw CSS values (`14px`, `#1a1a1a`) embed presentation into document content, break dark mode, fail under high-contrast or larger-text accessibility settings, and bypass theming. Semantic tokens guarantee responsive scaling and dark-mode legibility, matching the precedent already established by `callout` (`tone`).

### F17 — what an editor does with a document newer than itself · decided 2026-11-07

The editor encounters an unrecognised node/mark or an `attrs.schemaVersion` newer than
its own `SCHEMA_VERSION`.

**Decisions:**

1. **Unrecognised nodes and marks are preserved losslessly.**
    - The editor runs a pre-parse walk swapping unknown nodes and marks into a placeholder
      node/mark that preserves the exact original payload, and performs a reverse walk on
      serialization to write it back byte-for-byte.
    - In the editor, an "Unsupported block" placeholder UI is rendered so the author is
      aware content exists that their current version cannot edit directly.
    - In `@blockleaf/renderer`, unknown blocks skip rendering cleanly (emitting `null` / nothing)
      without noisy error banners for readers, though consumers may supply an `unknown` component
      override (`FC-05`).
2. **Default for newer `schemaVersion` is `readonly`.**
    - The editor introduces a configurable `futureDocument?: 'readonly' | 'preserve' | 'throw'` prop
      defaulting to `'readonly'`.
    - When opened in `readonly`, the document is displayed and readable, but editing and saving
      are locked to prevent accidental overwrite or corruption of newer schema structures.
    - Hosts that prefer seamless editing can opt into `'preserve'`.

**Amended 2026-11-08 (`FC-01`).** The trigger is wider and the prop is
renamed. A document that fails the content check — an unrecognised node or
mark at any `schemaVersion`, which is the common case once blocks ship as
subpaths — is the surer signal, and a newer version number that still parses
is the rarer one; both feed one policy. The prop is `incompatibleDocument`,
because `futureDocument` named only the second trigger. Its values are
`'readonly'` (default) and `'discard'`, which opens the empty fallback
editable and says so in its name; `'preserve'` cannot exist before `FC-03`,
and `'throw'` waits for `FC-02`. The lock is the package's by default because
the safe move needs nothing a host knows; the override is where host
knowledge belongs.

**Amended 2026-11-11 (`FC-03`).** An unrecognised node or mark no longer
triggers the policy at all: it opens as a placeholder and round-trips, and
the document stays editable. The policy is left with two triggers — a
structure the schema refuses, and a newer `schemaVersion`. `'preserve'` was
**not** added. The placeholders keep unknown _types_, but ProseMirror still
drops an unknown _attribute_ on a known node without a word, and an attribute
added to a known node is exactly what a version bump carries (`HD-10`,
`PA-20`). Opening a newer document editable would lose those attributes on
the first save. Revisit only with a walk that keeps unknown attributes too.

### F16 — the no-CSS-framework rule governs the packages, not the repo · decided 2026-10-14

`conventions.md` says "No CSS framework, and no `!important`", and says it
applies to `packages/*` **and** `apps/*`. `fumadocs-ui` depends on
`@fumadocs/tailwind`, so building the docs site means Tailwind v4 in
`apps/docs`. One of the two had to give.

The rule stays, scoped to where it was always aimed. It is a **product
promise**: install `@blockleaf/editor` and you are not made to adopt Tailwind,
a `prose` class, or a build step. PROJECT_PLAN §2 calls it a differentiator,
and it is about what a consumer is forced to install. `apps/docs` is never
published and nobody installs it, so Tailwind there costs a consumer nothing.

The choice was also already made. §6 specifies Fumadocs on Next.js, and F6
closed the question of revisiting it. Fumadocs has required Tailwind
throughout; adopting it and forbidding Tailwind was never coherent.

So `conventions.md` now says the rule covers `packages/*`, and names the
reason, instead of claiming a scope the repo visibly breaks. A rule that is
quietly violated is worse than one that is accurately stated — it stops
telling you anything.

**What does not change:** `packages/editor` and `packages/renderer` ship no
framework, one stylesheet, `--bl-*` custom properties, and no `!important`.
The size budgets still gate the published bundles. `apps/sandbox` stays plain
CSS, because nothing forces otherwise there.

One consequence worth naming: the demo runs the editor _inside_ a Tailwind
page, which is the first time the editor has met a CSS reset. It immediately
found two stylesheet bugs — see the changeset for `fix(editor)` on this
branch. That is the dogfooding working, not an argument against it.

### F15 — the renderer carries its own walker and its own URL rules · measured 2026-10-13

PROJECT_PLAN §5 says `@blockleaf/renderer` is built on
`@tiptap/static-renderer`. It is not, and the reason is a bug in the thing it
would have been built on.

**Mark nesting runs the wrong way.** `TiptapStaticRenderer` folds a node's
`marks` array so the _first_ mark ends up innermost. The editor's own
`getHTML` puts it outermost. The same stored node renders as
`<em><strong>text</strong></em>` there and `<strong><em>text</em></strong>` in
the editor:

| Source                    | `marks: [bold, italic]` renders as |
| ------------------------- | ---------------------------------- |
| `@blockleaf/editor`       | `<strong><em>text</em></strong>`   |
| `@tiptap/static-renderer` | `<em><strong>text</strong></em>`   |

Identical to look at for bold and italic. Not identical to a stylesheet, and
both packages are meant to share one — `a > code` matches in one and not the
other. The parity suite caught it on the second test written.

**The peer dependencies point the wrong way too.** The JSON entries import
nothing at runtime, which is the whole appeal, but the package declares
`@tiptap/pm`, `@tiptap/core` and `react-dom` as peers, and npm and pnpm both
install peers by default. Depending on it would put ProseMirror in the
`node_modules` of a package whose entire purpose is not to load ProseMirror.
Bundling it instead would have fixed that and not the mark order.

So the walker lives in `src/walk.ts`: about forty lines, target-agnostic, and
correct about mark order. It also takes `renderNode` and `combine`, which
RD-07 needs to split table rows into `<thead>` and `<tbody>` — grouping a flat
`nodeMapping` cannot express.

**The URL rules are duplicated on purpose.** `sanitizeHref` and `sanitizeSrc`
are copied from the editor's schema rather than imported from it, because
importing them would make the renderer depend on the editor. Sanitising in the
editor protects what gets _written_; the renderer reads documents written by
other versions, by a host's own API, or by an importer, and writes them into
HTML where an unsafe URL is an XSS hole rather than a broken link.
`tests/sanitize.test.ts` runs 29 vectors through both implementations and
fails if they disagree, so the copies cannot drift quietly.

Revisit if Tiptap fixes the mark order and drops the peers. Neither is likely
to be treated as a bug upstream, since the ProseMirror renderers in the same
package take their order from the schema and do not show it.

### F14 — the code block ships as an opt-in subpath · measured 2026-10-13

F10 chose a curated grammar set over `common` and recorded 26.37 kB of
headroom left afterwards. That headroom no longer exists: `CH` spent roughly
25 kB on the chrome, and `MC-01` to `MC-04` another 2.75 kB. The decision was
not wrong — its margin was simply consumed by the work it was protecting.

Re-measured against the real bundle rather than F10's three-day-old baseline:

| Build                                |          Size | Headroom under 160 kB |
| ------------------------------------ | ------------: | --------------------: |
| Baseline, after MC-04                | **144.63 kB** |              15.37 kB |
| + curated code block in `standard`   | **161.16 kB** |   **−1.16 kB — over** |
| Opt-in subpath, main entry unchanged | **144.63 kB** |              15.37 kB |

The marginal cost of the curated code block is **16.53 kB**, which confirms
F10's 16.69 kB. What changed is what is left to pay it with: 15.37 kB. The
default build does not merely get tight, it **breaches the ceiling by
1.16 kB** — before `details`, before the renderer, before `HD`.

**Decision: `@blockleaf/editor/code-block`, imported explicitly.**

```ts
import { createExtensions } from '@blockleaf/editor/extensions';
import { createCodeBlock } from '@blockleaf/editor/code-block';

const extensions = [...createExtensions('standard'), createCodeBlock()];
```

This is the shape F5 already chose for `@blockleaf/editor/validate`, for the
same reason: a feature most consumers will not use does not get charged to all
of them. A document with no code in it now costs nothing for syntax
highlighting, and a host that wants it pays 16.53 kB knowingly.

`StarterKit`'s plain `codeBlock` is untouched and still in the default build.
Opting out of the subpath means code blocks without highlighting, not no code
blocks — and the stored shape is identical either way, because `CodeBlockNode`
has carried an optional `language` since the v0.1 schema. Nothing migrates.

**Why not raise the ceiling instead.** It was already raised once, from 130 kB
to 160 kB, by F10. A budget that moves whenever something does not fit is not
a budget, and the thing asking for the increase is syntax highlighting — not
the editor. 400 kB editors are built one justified 16 kB at a time.

**Why not cut the grammar set further.** Seven is already the floor at which
the feature is worth having. The cost is not the grammars alone; `lowlight`
and `highlight.js`'s core carry most of it, so dropping to three would save
far less than it looks and make the feature worse.

### F1 — `@blockleaf` claimed on npm · settled 2026-10-11

The `@blockleaf` organization scope was created on npmjs.com. Package names,
tooling configs, and documentation reference `@blockleaf` natively without requiring
namespace changes. Unblocks SC-14 for the `0.0.1` publish.

### F2 — `NPM_TOKEN` verified in repository secrets · settled 2026-10-11

A granular access token with read/write publish permissions scoped to `@blockleaf`
was added as `NPM_TOKEN` in GitHub Actions repository secrets. Unblocks automated
provenance releases via `.github/workflows/release.yml`.

### F7 — Dogfood apps named; native storage adopted · settled 2026-10-11

Dogfood candidate projects are named: `flizz.io`, `bhaibrothers.dev`, and
`zahidshowrav.com`. Storage strategy is Option A: native document envelope
storage (`attrs.schemaVersion` in `JSONB`), validating at the mutation boundary
and preserving the document shape verbatim without lossy converters.

### F8 — Scheduled Tiptap canary added · built 2026-10-10

`.github/workflows/tiptap-latest.yml` runs Mondays at 06:00 UTC, and on demand.
It resolves `@tiptap/*` to `latest`, prints the versions it got, then
typechecks, tests, builds and measures the bundle.

It is deliberately not wired to pull requests, so it cannot gate a merge. A red
run is information — Tiptap changed something — not a blocked branch. The size
step is there because a Tiptap minor can move the bundle without breaking a
single test, which is the failure this project would otherwise notice last.

### F4 — Issue templates land now, in `SC` · decided 2026-10-10

PROJECT_PLAN §12.8 puts them in week one and §9 listed them again under `RD`;
week one wins. Templates cost nothing to carry and the repository is already
public, so the window where someone can file a shapeless issue is open now.

Three files under `.github/ISSUE_TEMPLATE/`: a bug form that asks for
`editor.getJSON()` rather than a screenshot, a feature form that points at §3's
out-of-scope list before asking "why now", and a `config.yml` that turns blank
issues off and routes questions to Discussions.

Discussions was enabled in repository settings and initialized on 2026-10-11.
SC-15 is complete.

### F13 — Tiptap and ProseMirror packages declare no `sideEffects` · measured 2026-10-13

`Placeholder` lives in `@tiptap/extensions@3.31.4`, which is already in the
dependency tree via StarterKit, so this looked free. It was not.

The package ships **no `sideEffects: false`** field, so a bundler must keep
the whole module graph for anyone who imports a single export from it. The
editor bundle barely noticed. The **schema-only** entry went from 136 B to
**60.77 kB** — a server that imports nothing but `createEmptyDocument` would
have shipped five editor extensions and ProseMirror's view layer.

| Entry                  |    Before | With `@tiptap/extensions` | Hand-rolled |
| ---------------------- | --------: | ------------------------: | ----------: |
| Editor                 | 139.31 kB |                 139.60 kB |   139.71 kB |
| Schema only (2 kB cap) |     136 B |              **60.77 kB** |   **136 B** |

**Decision: hand-roll the placeholder as a decoration plugin**, 0.40 kB, no
new import. The trailing node needed no new dependency either — StarterKit
already ships `trailingNode`; it was simply never configured, and its default
`notAfter: []` appends an empty paragraph after a _heading_, which then gets
saved. The stored document is the product, so that default was never
acceptable. It is now `['paragraph', 'heading']`, set in `createExtensions`.

It happened a third time in CH-08: importing `CellSelection` from
`@tiptap/pm/tables` to write `selection instanceof CellSelection` put 15.16 kB
into the same budget, because `prosemirror-tables` declares no `sideEffects`
either. A cell selection is now identified by its shape — `$anchorCell` and
`$headCell`, the two properties that define it, both of which survive
minification. Less obvious than `instanceof`, and commented accordingly.

**The 2 kB budget earned its keep three times in one block.** It caught both
of those, and it caught the unshakeable `new PluginKey` in F12. Nothing else in CI looks at
what a server-side consumer actually downloads — the editor budget has 20 kB
of headroom and would have absorbed both without a murmur.

Two further things the measurement turned up, both fixed here:

- `trailingNode` only appends from `appendTransaction`, which never runs for
  the document the editor was _created_ with. A saved document ending in a
  table opened with nowhere to click after it — the exact case the rule
  exists for. `TrailingNodeOnLoad` runs the check once at startup.
- That startup insert is not a user edit, but it reached `onChange`, so
  merely opening a document reported it as changed and would have triggered
  an autosave on load. It now carries `NORMALISATION_META` and
  `addToHistory: false`, and `onUpdate` additionally ignores any transaction
  with `docChanged === false` — ProseMirror appends an empty one after it,
  and that is the transaction Tiptap actually hands the callback.

### F12 — The drag handle is hand-rolled; Tiptap's costs 32.87 kB · measured 2026-10-13

`@tiptap/extension-drag-handle@3.31.4` was the obvious answer and is not the
right one. Its own dependency list is only `@floating-ui/dom`, which F11
established is already paid for — but its **peers are not optional**, and the
module-scope imports are real:

```
from "@tiptap/extension-collaboration"
from "@tiptap/y-tiptap"
```

So a document that will never be collaborative still ships yjs to get a grip
icon. Measured, not assumed:

| Build                                 |      Size | Cost over baseline |
| ------------------------------------- | --------: | -----------------: |
| Baseline after CH-02                  | 137.48 kB |                  — |
| + `@tiptap/extension-drag-handle`     | 170.35 kB |      **+32.87 kB** |
| + a hand-rolled handle (what shipped) | 139.31 kB |       **+1.83 kB** |

170.35 kB is **10.35 kB over the ceiling**, so this was never a budget
conversation — the extension does not fit at any headroom this project will
have. Opting out is not available either, because the import is unconditional.

**Decision: hand-roll it, as CH-03 did.** The handle is a ProseMirror plugin
that finds the hovered top-level block and positions a React-rendered element
beside it; the drag itself is handed to ProseMirror by setting a
`NodeSelection` and `view.dragging`, so nothing reimplements drop handling.
This is the opposite call to F11, and for the opposite reason: there, the
engine was already in the bundle and owning it bought nothing; here, the
engine drags a collaboration stack behind it and owning it is the only way in.

Revisit if Tiptap ever makes those peers optional — the extension handles
multi-block range selection, which the hand-rolled version does not.

**It also cost the schema-only budget, briefly.** The first build pushed the
server-side entry from 136 B to **11.79 kB** against its 2 kB limit. Two
module-scope expressions were not shakeable: `new PluginKey(...)` and the nine
`turnInto(...)` calls that build `defaultBlockActions`. Both now carry
`/* @__PURE__ */` and the entry is back to 136 B exactly. The 2 kB entry earned
its place here — nothing else in CI would have caught a server consumer
suddenly shipping the chrome.

### F11 — Bubble menu uses Tiptap's extension; floating-ui is already paid for · measured 2026-10-13

Measured the same way tables and `lowlight` were, before writing any of CH-02.
The question was whether a bubble menu's positioning engine could be afforded
with 28.68 kB of headroom and `MC-05`'s curated `lowlight` already holding a
measured 16.69 kB claim on it.

It turned out to be the wrong question. `@tiptap/suggestion` — bundled into the
editor since CH-01 shipped the slash menu — already pulls `@floating-ui/dom`,
and it is inlined in the shipped chunk today. The positioning engine is not a
new cost; it is a cost already on the invoice.

| Build                                       |      Size | Cost over baseline |
| ------------------------------------------- | --------: | -----------------: |
| Baseline — `BlockleafEditor` as shipped     | 131.32 kB |                  — |
| A · `BubbleMenu` from `@tiptap/react/menus` | 137.57 kB |       **+6.25 kB** |
| B · `@tiptap/extension-bubble-menu` plugin  | 135.66 kB |       **+4.34 kB** |
| C · hand-rolled `coordsAtPos` positioner    | 131.75 kB |       **+0.43 kB** |

**Decision: approach B — the framework-agnostic plugin, with our own React
wrapper. No budget change.**

B costs 4.34 kB because floating-ui is already there; what it adds is the
bubble-menu plugin's own selection tracking, `autoUpdate` wiring and teardown.
A costs 1.91 kB more than B for a React component that renders chrome we are
replacing anyway — `src/ui` owns the markup, and CH-08 needs a second instance
driven by a different `shouldShow`, which the plugin exposes directly.

C is the cheapest by 3.91 kB and still the wrong trade. The measured version
already carried flip, viewport clamping, rAF batching and scroll/resize
teardown, and it still would not cover scroll containers, `position: fixed`
ancestors, RTL or iOS visual-viewport behaviour — the cases HD-04 and HD-08 are
going to file as bugs. Paying 3.91 kB once to not own that is the cheaper side
of the trade, and it is the bundle-policy rule working as intended: measure
first, then spend deliberately. Opting out is not available here either — the
dependency is already in the graph, so nothing is saved for the consumer who
never opens a bubble menu.

Headroom after CH-02 lands at B: **24.34 kB**, which still clears `MC-05`'s
16.69 kB with 7.65 kB behind it. CH-03's drag handle is the next claim on that
and has not been measured.

**What it actually cost, once built:** 137.48 kB, so **+6.16 kB** rather than
the +4.34 kB this table predicted. The gap is ours, not Tiptap's — the
difference is the toolbar, link editor, icons and actions that the measurement
entry stubbed out. Real headroom is **22.52 kB**, which still clears `MC-05`
but with 5.83 kB behind it rather than 7.65 kB. The lesson for CH-03 is to
measure the dependency _and_ budget for the chrome that wraps it.

### F10 — Ceiling raised to 160 kB; `lowlight` ships curated · measured 2026-10-10

Measured the same way tables were. `lowlight` was indeed the risk, and its size
depends entirely on how many language grammars are registered.

| Build                                      |      Size | Cost of `lowlight` |
| ------------------------------------------ | --------: | -----------------: |
| Baseline                                   |  105.2 kB |                  — |
| + tables                                   | 116.94 kB |                  — |
| + tables + `lowlight`, 7 curated languages | 133.63 kB |       **16.69 kB** |
| + tables + `lowlight`, `common` (~37)      | 156.21 kB |       **39.27 kB** |

**Decision: the ceiling moves from 130 kB to 160 kB**, recorded in
`packages/editor/.size-limit.json` with a changeset. The schema-only entry is
untouched at 2 kB — server consumers still pay nothing.

160 kB admits either grammar set on paper, which is why the choice has to be
made on what is left rather than on what fits. `common` lands at 156.21 kB and
leaves **3.79 kB** for `taskList`, `callout`, `details` and `image` — four nodes
that will not fit in it. A curated set lands at 133.63 kB and leaves
**26.37 kB**, which is room to finish the editor.

So MC-05 ships a curated default and hosts register any further grammar
themselves. Not because `common` breaches the ceiling — at this ceiling it does
not — but because choosing it would spend the entire remainder of the budget on
syntax highlighting before the node set is finished.

### F9 — Tables fit the existing budget; nothing changes · measured 2026-10-10

Measured rather than argued. `@tiptap/extension-table@3.31.4` is one package in
Tiptap v3, not the four separate ones this flag originally assumed — `TableKit`
from its `/kit` subpath carries `Table`, `TableRow`, `TableHeader` and
`TableCell` together.

| Build                         |          Size | Headroom under the 130 kB limit |
| ----------------------------- | ------------: | ------------------------------: |
| Baseline                      |      105.2 kB |                         24.8 kB |
| With `TableKit` in `standard` |     116.94 kB |                        13.06 kB |
| **Table cost**                | **+11.74 kB** |                               — |

**Decision: no budget change.** Tables fit with 13 kB to spare, so none of the
three options this flag proposed is needed — the cheapest outcome was the one
nobody could pick without the number. The schema-only entry stayed at 110 B,
confirming tree-shaking holds: a server that imports `createEmptyDocument` pays
nothing for tables.

What the measurement did change is where the risk sits. See F10.

### F6 — The docs site was never undecided · closed 2026-10-10

Raised in error. `PROJECT_PLAN.md` §6 already specifies Fumadocs on Next.js,
deployed to Vercel, in `apps/docs`, with MDX content and embedded React
playgrounds. The flag claimed no framework, host or location was named; all
three were. RD-04 inherits that decision and no new one was needed.

### F3 — Playwright moves to `EC` · decided 2026-10-10

Playwright leaves the `SC` scaffold and arrives at the start of `EC`, as EC-20.

`SC` produces a box you can type in, which a browser harness adds nothing to.
`EC` produces table cell navigation, selection across cells and input rules —
precisely the behaviour PROJECT_PLAN §7 warns jsdom cannot see. The harness
lands when it has something real to catch, and SC-13 stops holding `SC` open.

### F5 — Validation ships as an opt-in subpath · decided 2026-10-10

Deep validation is exported from `@blockleaf/editor/validate`, with Zod declared
as an **optional peer dependency** rather than a direct one. A host that wants to
reject malformed client input server-side installs Zod and imports the subpath;
everyone else never loads it.

Chosen because the alternative puts a validation library inside the 2 kB
schema-only budget that every server-side consumer pays, to get a feature most of
them will not call. The subpath keeps PROJECT_PLAN §3 rule 5 — validation at the
boundary, the genuine differentiator — without charging it to people who render
documents and never store them. Tracked as EC-19.

---

Resolved flags move here with the decision and its date, so the
reasoning survives the commit that acted on it.

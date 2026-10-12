# Open flags

Decisions and unknowns that need the developer, not the next commit. Each one
names what is blocked, so a flag either gets answered or gets closed as
deliberately deferred — it does not sit here as a vague worry.

Flags are referenced by id from [`progress-tracker.md`](./progress-tracker.md). Resolve one by
recording the decision inline and moving it to **Settled**, rather than deleting
it; the reasoning is worth more later than the tidiness is now.

**Open:** none · **Settled:** F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11 · **Last reviewed:** 2026-10-13

---

## Settled

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

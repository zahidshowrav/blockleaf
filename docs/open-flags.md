# Open flags

Decisions and unknowns that need the developer, not the next commit. Each one
names what is blocked, so a flag either gets answered or gets closed as
deliberately deferred — it does not sit here as a vague worry.

Flags are referenced by id from [`progress-tracker.md`](./progress-tracker.md). Resolve one by
recording the decision inline and moving it to **Settled**, rather than deleting
it; the reasoning is worth more later than the tidiness is now.

**Open:** F1–F8 · **Last reviewed:** 2026-10-09

---

## F1 — `@blockleaf` is not registered on npm · blocks M0 exit

`npm view @blockleaf/editor` returns 404, so the scope is unclaimed, unverified,
or claimed by someone else. §12.1 makes registering it step one of week one, and
§12.6 publishes `0.0.1` on day two precisely because "publishing is a muscle;
exercise it before there is anything to lose."

Until this is settled the M0 exit test cannot be run at all, and the packaging
gates in CI are testing a tarball nobody can install.

**Needed:** confirm the scope is yours, or pick another name before anything
else references it. The scope appears in package names, docs, the README and the
schema doc — the cost of changing it rises every milestone.

## F2 — `NPM_TOKEN` not confirmed in repo secrets · blocks the release workflow

`release.yml` reads `secrets.NPM_TOKEN` for both `NPM_TOKEN` and
`NODE_AUTH_TOKEN`. The repo was created empty and connected on 2026-10-09; the
secret has not been verified as present. With provenance enabled the token must
also be a granular or automation token that permits publishing to the scope.

**Needed:** add the secret, then prove the path end to end with the `0.0.1`
publish from F1 rather than discovering it on the first release that matters.

## F3 — Playwright is in M0 scope but absent · M0 checklist

§9 lists Playwright among the M0 scaffold, but there is no Playwright config,
dependency or e2e directory. Nothing in M0 or M1 produces a UI worth driving in
a browser — the default chrome is M2 — so installing it now buys CI time and a
dependency in exchange for tests of a contenteditable box.

**Needed:** either stand it up now with one smoke spec so the harness exists
before it is urgent, or move it explicitly to M2 and amend §9. Leaving it
unstated means M0 can never be honestly ticked closed.

## F4 — Issue templates and Discussions unowned · M0 or M4

§12.8 puts issue templates and Discussions in the first week; §9 lists issue
templates again under M4 alongside the public launch. `.github/` currently holds
workflows only. Both placements are defensible — templates matter once strangers
can file issues, which is M4 — but only one can be the checklist item.

**Needed:** pick the milestone. Repository Discussions must be enabled in
GitHub settings by hand either way.

## F5 — `BlockleafNode` is structural, and the validator it implies is not chosen

`src/core/schema.ts` types nodes structurally and its comment commits M1 to "an
exported Zod schema", but Zod is not a dependency and the choice was never made
in the plan. The schema-only `size-limit` budget is 2 kB, which a validator can
plausibly break, and a validation library in `dependencies` is imposed on every
consumer including server-side renderers.

**Needed:** decide what deep validation is and where its weight lands — Zod as a
real dependency, Zod as an optional peer behind a subpath export, or a
hand-written predicate with no dependency at all. This is M1's first decision
because the node union is written against it.

## F6 — Docs site framework and hosting unchosen · M4

§6 commits to a docs site with a live demo, but no framework, domain or host is
named and `apps/docs` does not exist. The site is the wedge described in §1 and
in §11's "nobody uses it" mitigation, so it is not a cosmetic choice: it has to
run the editor itself, which constrains the framework more than a docs site
usually is constrained.

**Needed:** choose before M4 opens, and buy the domain earlier than that if one
is wanted.

## F7 — The dogfood app is unnamed · M4

§10 is unambiguous that the first real consumer should be your own project
during M4, not after 1.0, and that it exposes bad API under deadline. No
candidate app is named anywhere in the repo.

Naming it also forces §10's other decision: whether that app adopts this
editor's document as its stored shape, a migration done once, or keeps a
converter at the boundary and accepts the ceiling that imposes. The plan is
explicit that this is decided per app and that the editor's design must not bend
to one consumer's legacy format.

**Needed:** name the app, then make the storage call for it specifically.

## F8 — No scheduled build against Tiptap `@latest` · standing guard

§11's mitigation for Tiptap v3 churn is a scheduled CI job that builds against
`@latest` so breakage is found before a user finds it. Only `ci.yml` and
`release.yml` exist, both triggered by push or pull request. Tiptap is pinned to
exact `3.31.4`, which is the other half of that mitigation and is in place — the
early-warning half is not.

**Needed:** a cron-scheduled workflow that installs Tiptap at `@latest`, builds
and tests, and is allowed to fail without blocking anything else.

---

## Settled

Nothing yet. Resolved flags move here with the decision and its date, so the
reasoning survives the commit that acted on it.

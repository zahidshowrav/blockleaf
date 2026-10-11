# @blockleaf/editor

## 0.0.2

### Patch Changes

- 46f8c2d: Raise the bundle ceiling from 130 kB to 160 kB. Measured, not guessed: tables cost 11.74 kB and `lowlight` costs 16.69 kB curated or 39.27 kB with the `common` grammar set. The schema-only budget is unchanged at 2 kB.

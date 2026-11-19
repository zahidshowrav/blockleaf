#!/usr/bin/env sh

# Vercel's "Ignored Build Step" for apps/docs (wired in apps/docs/vercel.json).
# Exit 0 skips the build, any other exit runs it.
#
# Previews always build, so every PR still gets a docs preview. Production
# builds only on the commit that releases to npm — the one where Changesets
# writes the package CHANGELOGs — so blockleaf.dev never documents a feature
# that cannot be installed yet (SG-05).

if [ "$VERCEL_ENV" != "production" ]; then
  echo "Preview build: building."
  exit 1
fi

# Vercel runs this from the project's Root Directory, apps/docs.
cd "$(git rev-parse --show-toplevel)" || exit 1

# A missing parent (a shallow clone, the first commit) exits 128 here and
# falls through to a build: when in doubt, build.
if git diff --quiet HEAD^ HEAD -- packages/editor/CHANGELOG.md packages/renderer/CHANGELOG.md; then
  echo "Production build skipped: this commit is not a release."
  exit 0
fi

echo "Release commit: building."
exit 1

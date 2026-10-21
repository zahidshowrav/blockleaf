import editorPackage from '../../../packages/editor/package.json';
import rendererPackage from '../../../packages/renderer/package.json';

/**
 * The one place the docs learn what version a package is on.
 *
 * Read from the workspace manifests rather than from npm. Changesets bumps
 * those manifests in the release PR and publishes on merge, so at any
 * committed state of `main` the manifest and the registry agree — and this
 * costs no network call that could fail a build.
 *
 * Every page that names a current version uses `<PackageVersion />`. A
 * literal `@blockleaf/editor@0.0.5` in prose is how the comparisons table
 * came to claim a version five releases old, and `scripts/check-doc-versions.ts`
 * fails the build if one reappears.
 *
 * Versions in a *historical* sentence — "the exemption expired when `0.1.0`
 * was published" — are facts about the past and stay written out.
 */
export const packageVersions = {
	editor: editorPackage.version,
	renderer: rendererPackage.version
} as const;

export type PackageName = keyof typeof packageVersions;

export const packageSpec = (name: PackageName): string =>
	`@blockleaf/${name}@${packageVersions[name]}`;

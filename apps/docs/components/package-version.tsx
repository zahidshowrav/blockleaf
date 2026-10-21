import {
	packageSpec,
	packageVersions,
	type PackageName
} from '@/lib/package-versions';

export interface PackageVersionProps {
	/** Which package. Defaults to the editor, which is what pages usually mean. */
	name?: PackageName;
	/** Renders just the number, for a sentence that already names the package. */
	bare?: boolean;
}

/**
 * The current version of a published package, as inline code.
 *
 * In scope on every page, so naming a version is a tag rather than a literal
 * somebody has to remember to update.
 */
export const PackageVersion = ({
	name = 'editor',
	bare = false
}: PackageVersionProps) => (
	<code>{bare ? packageVersions[name] : packageSpec(name)}</code>
);

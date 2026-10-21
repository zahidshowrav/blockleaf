import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { AutosaveExample } from '@/components/examples/autosave-example';
import { MinimalExample } from '@/components/examples/minimal-example';
import { ReadOnlyExample } from '@/components/examples/read-only-example';
import { SlashCommandExample } from '@/components/examples/slash-command-example';
import { PackageVersion } from '@/components/package-version';

/**
 * The live examples are in scope for every page, so an example page is prose
 * with one tag in it rather than prose plus an import line readers have to
 * ignore.
 */
const examples = {
	AutosaveExample,
	MinimalExample,
	ReadOnlyExample,
	SlashCommandExample
};

export const getMDXComponents = (components?: MDXComponents) =>
	({
		...defaultMdxComponents,
		...examples,
		PackageVersion,
		...components
	}) satisfies MDXComponents;

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

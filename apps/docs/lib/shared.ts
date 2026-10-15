import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Blockleaf';
export const appTagline = 'The Notion-style block editor for React';
export const appDescription =
	'A Notion-style block editor on Tiptap. Headless-first, no CSS framework, versioned JSON out.';

/**
 * Absolute origin, used for `metadataBase`, canonicals and the sitemap.
 * Overridable so preview deployments do not advertise production URLs.
 */
export const siteUrl = new URL(
	process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blockleaf.dev'
);
export const docsRoute = '/docs';
export const blogRoute = '/blog';
export const changelogRoute = '/changelog';
export const contributorsRoute = '/contributors';
export const docsContentRoute = '/llms.mdx/docs';
export const blogContentRoute = '/llms.mdx/blog';

export const gitConfig = {
	user: 'zahidshowrav',
	repo: 'blockleaf',
	branch: 'main'
};

const contentUrl = {
	docs: createGetUrl(docsContentRoute),
	blog: createGetUrl(blogContentRoute)
};

/** The plain-markdown representation of a page, for humans and for models. */
export const getPageMarkdownUrl = (
	page: { slugs: string[]; locale?: string },
	section: 'docs' | 'blog' = 'docs'
) => {
	const segments = [...page.slugs, 'content.md'];

	return { segments, url: contentUrl[section](segments, page.locale) };
};

const getImageUrl = createGetUrl('/og');

/**
 * The social card for a page, generated at build time by `app/og`.
 *
 * `image.png` is appended to the slugs so the route can take `[...slug]` and
 * still produce a URL that ends in a real file extension — some scrapers
 * will not look at an `og:image` that does not.
 */
export const getPageImageUrl = (
	section: 'docs' | 'blog',
	page: { slugs: string[]; locale?: string }
) => {
	const segments = [section, ...page.slugs, 'image.png'];

	return { segments, url: getImageUrl(segments, page.locale) };
};

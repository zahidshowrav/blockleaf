import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Blockleaf';
export const appDescription =
	'A Notion-style block editor on Tiptap. Headless-first, no CSS framework, versioned JSON out.';
export const docsRoute = '/docs';
export const blogRoute = '/blog';
export const changelogRoute = '/changelog';
export const contributorsRoute = '/contributors';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
	user: 'zahidshowrav',
	repo: 'blockleaf',
	branch: 'main'
};

const getContentUrl = createGetUrl(docsContentRoute);

/** The plain-markdown representation of a page, for humans and for models. */
export const getPageMarkdownUrl = (page: {
	slugs: string[];
	locale?: string;
}) => {
	const segments = [...page.slugs, 'content.md'];

	return { segments, url: getContentUrl(segments, page.locale) };
};

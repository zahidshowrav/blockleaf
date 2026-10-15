import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';

import { blogPageSchema, type BlogAuthor } from '@/lib/blog';
import { blogRoute, docsRoute, gitConfig } from '@/lib/shared';

const docs = defineDocs({
	dir: 'content/docs',
	docs: {
		schema: pageSchema,
		postprocess: {
			includeProcessedMarkdown: true
		}
	},
	meta: {
		schema: metaSchema
	}
});

export const source = loader({
	baseUrl: docsRoute,
	source: docs.toFumadocsSource(),
	plugins: [lucideIconsPlugin()]
});

const renderPage = async (page: {
	url: string;
	data: { title: string; getText: (type: 'processed') => Promise<string> };
}) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`;

export const docsLlms = llms(source, { renderPage });

const blog = defineCollections({
	type: 'doc',
	dir: 'content/blog',
	schema: blogPageSchema,
	postprocess: {
		includeProcessedMarkdown: true
	}
});

export const blogSource = loader({
	baseUrl: blogRoute,
	source: blog.toFumadocsSource(),
	pageTree: {
		// A `doc` collection carries no meta file, so the tree root would be
		// named `Docs` — which is the heading `llms.txt` prints for it.
		transformers: [{ root: (root) => ({ ...root, name: 'Blog' }) }]
	}
});

/**
 * Keyed by what a post's `authors` frontmatter refers to. An unknown key is
 * shown as a plain name rather than dropped, so a guest post does not need
 * an entry here first.
 */
export const blogAuthors: Record<string, BlogAuthor> = {
	zahid: {
		name: 'Zahid R. Showrav',
		title: 'Author of Blockleaf',
		url: `https://github.com/${gitConfig.user}`,
		image: 'https://avatars.githubusercontent.com/u/26140192?v=4'
	}
};

export const blogLlms = llms(blogSource, { renderPage });

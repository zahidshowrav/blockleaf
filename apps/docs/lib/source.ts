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

export const docsLlms = llms(source, {
	renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`
});

const blog = defineCollections({
	type: 'doc',
	dir: 'content/blog',
	schema: blogPageSchema
});

export const blogSource = loader({
	baseUrl: blogRoute,
	source: blog.toFumadocsSource()
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

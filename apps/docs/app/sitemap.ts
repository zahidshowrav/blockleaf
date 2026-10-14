import type { MetadataRoute } from 'next';

import { getPosts, getTags } from '@/lib/blog';
import {
	blogRoute,
	changelogRoute,
	contributorsRoute,
	siteUrl
} from '@/lib/shared';
import { blogSource, source } from '@/lib/source';

const absolute = (path: string) => new URL(path, siteUrl).href;

const sitemap = (): MetadataRoute.Sitemap => {
	const posts = getPosts(blogSource.getPages());

	return [
		{ url: absolute('/'), changeFrequency: 'weekly', priority: 1 },
		...source.getPages().map((page) => ({
			url: absolute(page.url),
			changeFrequency: 'weekly' as const,
			priority: page.url === '/docs' ? 0.9 : 0.8
		})),
		{
			url: absolute(blogRoute),
			changeFrequency: 'weekly' as const,
			priority: 0.7
		},
		...posts.map((post) => ({
			url: absolute(post.url),
			lastModified: post.date,
			changeFrequency: 'yearly' as const,
			priority: 0.7
		})),
		{
			url: absolute(`${blogRoute}/tags`),
			changeFrequency: 'monthly' as const,
			priority: 0.3
		},
		...getTags(posts).map((tag) => ({
			url: absolute(tag.url),
			changeFrequency: 'monthly' as const,
			priority: 0.3
		})),
		{
			url: absolute(changelogRoute),
			changeFrequency: 'weekly' as const,
			priority: 0.5
		},
		{
			url: absolute(contributorsRoute),
			changeFrequency: 'monthly' as const,
			priority: 0.3
		}
	];
};

export default sitemap;

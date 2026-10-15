import { notFound } from 'next/navigation';

import { getPageMarkdownUrl } from '@/lib/shared';
import { blogLlms, blogSource } from '@/lib/source';

export const revalidate = false;

export const GET = async (
	_request: Request,
	{ params }: RouteContext<'/llms.mdx/blog/[[...slug]]'>
) => {
	const { slug } = await params;
	// The trailing `content.md` is not part of the post's slug.
	const page = blogSource.getPage(slug?.slice(0, -1));
	if (!page) notFound();

	return new Response(await blogLlms.page(page), {
		headers: { 'Content-Type': 'text/markdown' }
	});
};

export const generateStaticParams = () =>
	blogSource.getPages().map((page) => ({
		lang: page.locale,
		slug: getPageMarkdownUrl(page, 'blog').segments
	}));

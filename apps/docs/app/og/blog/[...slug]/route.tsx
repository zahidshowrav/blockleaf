import { notFound } from 'next/navigation';

import { renderOGImage } from '@/lib/og';
import { getPageImageUrl } from '@/lib/shared';
import { blogSource } from '@/lib/source';

export const revalidate = false;

export const GET = async (
	_request: Request,
	{ params }: RouteContext<'/og/blog/[...slug]'>
) => {
	const { slug } = await params;
	const page = blogSource.getPage(slug.slice(0, -1));
	if (!page) notFound();

	return renderOGImage({
		title: page.data.title,
		description: page.data.description,
		section: 'Blog'
	});
};

export const generateStaticParams = () =>
	blogSource.getPages().map((page) => ({
		lang: page.locale,
		slug: getPageImageUrl('blog', page).segments.slice(1)
	}));

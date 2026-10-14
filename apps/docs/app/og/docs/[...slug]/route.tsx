import { notFound } from 'next/navigation';

import { renderOGImage } from '@/lib/og';
import { getPageImageUrl } from '@/lib/shared';
import { source } from '@/lib/source';

export const revalidate = false;

export const GET = async (
	_request: Request,
	{ params }: RouteContext<'/og/docs/[...slug]'>
) => {
	const { slug } = await params;
	// The last segment is `image.png`, not part of the page's slug.
	const page = source.getPage(slug.slice(0, -1));
	if (!page) notFound();

	return renderOGImage({
		title: page.data.title,
		description: page.data.description,
		section: 'Documentation'
	});
};

export const generateStaticParams = () =>
	source.getPages().map((page) => ({
		lang: page.locale,
		slug: getPageImageUrl('docs', page).segments.slice(1)
	}));

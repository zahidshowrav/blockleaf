import type { Metadata } from 'next';

import {
	BlogBackLink,
	BlogHeader,
	BlogTagCards,
	BlogTitle
} from '@/components/blog';
import { getPosts, getTags } from '@/lib/blog';
import { blogRoute } from '@/lib/shared';
import { blogSource } from '@/lib/source';

export const metadata: Metadata = {
	title: 'Tags',
	description: 'Every subject the Blockleaf blog has written about.',
	alternates: { canonical: `${blogRoute}/tags` }
};

const Page = () => {
	const tags = getTags(getPosts(blogSource.getPages()));

	return (
		<>
			<BlogHeader>
				<BlogBackLink href={blogRoute} />
				<BlogTitle>All tags</BlogTitle>
			</BlogHeader>
			<BlogTagCards tags={tags} />
		</>
	);
};

export default Page;

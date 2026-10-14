import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
	BlogBackLink,
	BlogCards,
	BlogHeader,
	BlogTitle
} from '@/components/blog';
import { getPosts, getTagPosts, getTags } from '@/lib/blog';
import { blogRoute } from '@/lib/shared';
import { blogAuthors, blogSource } from '@/lib/source';

const find = async (tag: string) =>
	getTagPosts(getPosts(blogSource.getPages(), blogAuthors), tag);

const Page = async (props: PageProps<'/blog/tags/[tag]'>) => {
	const { tag } = await props.params;
	const result = await find(tag);
	if (!result) notFound();

	return (
		<>
			<BlogHeader>
				<BlogBackLink href={`${blogRoute}/tags`}>
					Back to tags
				</BlogBackLink>
				<BlogTitle>{result.tag.name}</BlogTitle>
			</BlogHeader>
			<BlogCards posts={result.posts} />
		</>
	);
};

export default Page;

export const generateStaticParams = () =>
	getTags(getPosts(blogSource.getPages())).map((tag) => ({ tag: tag.slug }));

export const generateMetadata = async (
	props: PageProps<'/blog/tags/[tag]'>
): Promise<Metadata> => {
	const { tag } = await props.params;
	const result = await find(tag);
	if (!result) notFound();

	return {
		title: `${result.tag.name} — Blog`,
		description: `Blockleaf posts tagged ${result.tag.name}.`,
		alternates: { canonical: result.tag.url }
	};
};

import type { Metadata } from 'next';
import Link from 'next/link';

import { BlogCards, BlogHeader, BlogTitle } from '@/components/blog';
import { getPosts } from '@/lib/blog';
import { blogRoute } from '@/lib/shared';
import { blogAuthors, blogSource } from '@/lib/source';

export const metadata: Metadata = {
	title: 'Blog',
	description:
		'Notes on building Blockleaf — the document schema, the editor landscape, and what gets decided for you.',
	alternates: { canonical: blogRoute }
};

const Page = () => {
	const posts = getPosts(blogSource.getPages(), blogAuthors);

	return (
		<>
			<BlogHeader>
				<BlogTitle>Blog</BlogTitle>
				<p className="text-fd-muted-foreground">
					Why the editor is shaped the way it is, and what we learned
					getting there.{' '}
					<Link
						href={`${blogRoute}/tags`}
						className="text-fd-primary underline underline-offset-4"
					>
						Browse by tag
					</Link>
					.
				</p>
			</BlogHeader>
			{posts.length > 0 ? (
				<BlogCards posts={posts} />
			) : (
				<p className="text-fd-muted-foreground">
					Nothing published yet.
				</p>
			)}
		</>
	);
};

export default Page;

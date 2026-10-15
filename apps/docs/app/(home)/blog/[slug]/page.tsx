import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
	BlogAuthors,
	BlogBackLink,
	BlogBody,
	BlogDate,
	BlogDescription,
	BlogHeader,
	BlogPage,
	BlogPostNav,
	BlogTags,
	BlogTitle
} from '@/components/blog';
import { getMDXComponents } from '@/components/mdx';
import { PostStructuredData } from '@/components/structured-data';
import { findPost, getPosts } from '@/lib/blog';
import { blogRoute, getPageImageUrl } from '@/lib/shared';
import { blogAuthors, blogSource } from '@/lib/source';

const find = async (slug: string) => {
	const page = blogSource.getPage([slug]);
	if (!page) return undefined;

	const found = findPost(
		getPosts(blogSource.getPages(), blogAuthors),
		page.url
	);
	if (!found) return undefined;

	return { page, ...found };
};

const Page = async (props: PageProps<'/blog/[slug]'>) => {
	const { slug } = await props.params;
	const result = await find(slug);
	if (!result) notFound();

	const { page, post, newer, older } = result;
	const MDX = page.data.body;

	return (
		<BlogPage toc={page.data.toc}>
			<PostStructuredData
				title={post.title}
				description={post.description}
				url={post.url}
				image={post.image ?? getPageImageUrl('blog', page).url}
				datePublished={post.date?.toISOString()}
				authors={post.authors}
			/>
			<BlogHeader>
				<BlogBackLink href={blogRoute} />
				<BlogTitle>{post.title}</BlogTitle>
				<BlogDescription>{post.description}</BlogDescription>
				<BlogAuthors authors={post.authors} />
				<BlogTags tags={post.tags} />
				{post.date && <BlogDate date={post.date} />}
			</BlogHeader>
			<BlogBody>
				<MDX components={getMDXComponents()} />
			</BlogBody>
			<BlogPostNav
				newer={newer}
				older={older}
			/>
		</BlogPage>
	);
};

export default Page;

export const generateStaticParams = () =>
	blogSource.getPages().map((page) => ({ slug: page.slugs[0] ?? '' }));

export const generateMetadata = async (
	props: PageProps<'/blog/[slug]'>
): Promise<Metadata> => {
	const { slug } = await props.params;
	const result = await find(slug);
	if (!result) notFound();

	const { page, post } = result;
	const image = post.image ?? getPageImageUrl('blog', page).url;

	return {
		title: post.title,
		description: post.description,
		alternates: { canonical: post.url },
		openGraph: {
			type: 'article',
			title: post.title,
			description: post.description,
			url: post.url,
			publishedTime: post.date?.toISOString(),
			authors: post.authors.map((author) => author.name),
			tags: post.tags.map((tag) => tag.name),
			images: image
		},
		twitter: { card: 'summary_large_image', images: image }
	};
};

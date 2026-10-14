import { githubReleases } from '@fumadocs/changelog/github';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ChangelogPagination, ChangelogTimeline } from '@/components/changelog';
import { changelogRoute, gitConfig } from '@/lib/shared';

/**
 * Releases come straight from GitHub rather than a second copy of the notes
 * in this repository: the release bodies are generated from the changesets
 * that shipped each version, so a changelog page here would be a transcript
 * that drifts.
 *
 * Unauthenticated calls to the GitHub API are capped at 60 an hour, hence
 * the revalidate window and the optional token.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
	title: 'Changelog',
	description:
		'Every published release of @blockleaf/editor and @blockleaf/renderer, with the notes that shipped with them.',
	alternates: { canonical: changelogRoute }
};

const Page = async (props: PageProps<'/changelog/[[...page]]'>) => {
	const { page: segments = [] } = await props.params;
	const page = Number(segments[0] ?? 1);
	if (!Number.isInteger(page) || page < 1) notFound();

	const { entries, nextPage } = await githubReleases({
		owner: gitConfig.user,
		repo: gitConfig.repo,
		token: process.env.GITHUB_TOKEN,
		page
	});
	if (entries.length === 0) notFound();

	return (
		<div className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-24">
			<h1 className="mb-2 text-3xl font-semibold tracking-tight">
				Changelog
			</h1>
			<p className="text-fd-muted-foreground mb-10">
				Published releases, newest first. Read from the{' '}
				<a
					href={`https://github.com/${gitConfig.user}/${gitConfig.repo}/releases`}
					className="text-fd-primary underline underline-offset-4"
					rel="noreferrer"
				>
					GitHub releases
				</a>{' '}
				the release workflow writes.
			</p>
			<ChangelogTimeline entries={entries} />
			<ChangelogPagination
				newer={page > 1 ? `${changelogRoute}/${page - 1}` : undefined}
				older={nextPage ? `${changelogRoute}/${nextPage}` : undefined}
			/>
		</div>
	);
};

export default Page;

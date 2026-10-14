import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { getContributors } from '@/lib/contributors';
import { contributorsRoute, docsRoute, gitConfig } from '@/lib/shared';

export const revalidate = 3600;

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

export const metadata: Metadata = {
	title: 'Contributors',
	description:
		'Everyone who has shipped a commit to Blockleaf, and how to become one of them.',
	alternates: { canonical: contributorsRoute }
};

const Page = async () => {
	const contributors = await getContributors();

	return (
		<div className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-24">
			<h1 className="text-3xl font-semibold tracking-tight">
				Contributors
			</h1>
			<p className="text-fd-muted-foreground mt-3 max-w-2xl">
				Everyone with a commit on <code>main</code>, read from GitHub.
				Release-bot commits are left out.
			</p>

			{contributors.length > 0 ? (
				<ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
					{contributors.map((person) => (
						<li key={person.login}>
							<a
								href={person.url}
								rel="noreferrer"
								className="border-fd-border bg-fd-card hover:bg-fd-accent hover:text-fd-accent-foreground flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors"
							>
								<Image
									src={person.avatar}
									alt=""
									width={56}
									height={56}
									className="size-14 rounded-full"
								/>
								<span className="truncate text-sm font-medium">
									{person.login}
								</span>
								<span className="text-fd-muted-foreground text-xs">
									{person.contributions === 1
										? '1 commit'
										: `${person.contributions} commits`}
								</span>
							</a>
						</li>
					))}
				</ul>
			) : (
				<p className="text-fd-muted-foreground mt-10">
					GitHub did not answer just now — the list is on{' '}
					<a
						href={`${repoUrl}/graphs/contributors`}
						rel="noreferrer"
						className="text-fd-primary underline underline-offset-4"
					>
						the repository
					</a>
					.
				</p>
			)}

			<h2 className="mt-16 text-xl font-semibold tracking-tight">
				Adding yourself
			</h2>
			<p className="text-fd-muted-foreground mt-3 max-w-2xl">
				The work worth doing is listed in{' '}
				<a
					href={`${repoUrl}/issues`}
					rel="noreferrer"
					className="text-fd-primary underline underline-offset-4"
				>
					the issues
				</a>
				. Two things are worth reading first:{' '}
				<Link
					href={`${docsRoute}/schema`}
					className="text-fd-primary underline underline-offset-4"
				>
					the document
				</Link>
				, because the stored shape is versioned and a change to it ships
				a migration in the same pull request, and{' '}
				<Link
					href={`${docsRoute}/styling`}
					className="text-fd-primary underline underline-offset-4"
				>
					the style guide
				</Link>
				, because the published packages carry no CSS framework and no{' '}
				<code>!important</code>.
			</p>
		</div>
	);
};

export default Page;

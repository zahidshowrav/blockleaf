import type { Metadata } from 'next';

import { gitConfig } from '@/lib/shared';

export const metadata: Metadata = {
	title: 'Blog',
	description:
		'Release notes and notes on building Blockleaf — the schema, the renderer, and the decisions behind them.'
};

const Page = () => (
	<main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16">
		<h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
		<p className="text-fd-muted-foreground mt-3 max-w-2xl">
			No posts yet. Release notes and the reasoning behind the schema, the
			renderer and the bundle budgets will land here.
		</p>
		<p className="text-fd-muted-foreground mt-3 max-w-2xl">
			In the meantime, every release is tagged on{' '}
			<a
				href={`https://github.com/${gitConfig.user}/${gitConfig.repo}/releases`}
				className="text-fd-primary underline underline-offset-4"
				rel="noreferrer"
				target="_blank"
			>
				GitHub
			</a>
			.
		</p>
	</main>
);

export default Page;

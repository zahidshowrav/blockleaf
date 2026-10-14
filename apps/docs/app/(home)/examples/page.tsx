import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Examples',
	description:
		'Runnable recipes for Blockleaf — collaborative storage, custom chrome, migration from other editors.'
};

const Page = () => (
	<main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16">
		<h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
		<p className="text-fd-muted-foreground mt-3 max-w-2xl">
			Nothing here yet. Recipes are being written — persisting to a
			database, replacing the slash menu, wiring uploads to S3, and
			migrating from Novel or plain Tiptap.
		</p>
		<p className="text-fd-muted-foreground mt-3 max-w-2xl">
			Until they land, the editor on the{' '}
			<Link
				href="/"
				className="text-fd-primary underline underline-offset-4"
			>
				home page
			</Link>{' '}
			is real and the{' '}
			<Link
				href="/docs"
				className="text-fd-primary underline underline-offset-4"
			>
				documentation
			</Link>{' '}
			carries working code for every feature.
		</p>
	</main>
);

export default Page;

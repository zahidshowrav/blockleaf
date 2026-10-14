import Link from 'next/link';

import { LiveDemo } from '@/components/live-demo';

const Page = () => (
	<main className="flex flex-1 flex-col">
		<section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16">
			<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
				A block editor that hands you JSON.
			</h1>
			<p className="text-fd-muted-foreground mt-3 max-w-2xl text-base sm:text-lg">
				Notion-style editing on Tiptap — slash menu, drag handles,
				tables, uploads. No CSS framework, no opinion about where your
				content lives, and a renderer for the server in the box.
			</p>

			<div className="mt-6 flex flex-wrap gap-3">
				<Link
					href="/docs"
					className="bg-fd-primary text-fd-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
				>
					Get started
				</Link>
				<Link
					href="/docs/schema"
					className="border-fd-border rounded-lg border px-4 py-2 text-sm font-medium"
				>
					The JSON contract
				</Link>
			</div>

			<div className="mt-10">
				<LiveDemo />
			</div>

			<dl className="mt-12 grid gap-6 sm:grid-cols-3">
				<div>
					<dt className="font-medium">Versioned JSON</dt>
					<dd className="text-fd-muted-foreground mt-1 text-sm">
						Every document carries a schema version, and every
						change to the stored shape ships a migration.
					</dd>
				</div>
				<div>
					<dt className="font-medium">Server rendering included</dt>
					<dd className="text-fd-muted-foreground mt-1 text-sm">
						<code>@blockleaf/renderer</code> turns stored JSON into
						React or HTML with no editor and no ProseMirror.
					</dd>
				</div>
				<div>
					<dt className="font-medium">One stylesheet</dt>
					<dd className="text-fd-muted-foreground mt-1 text-sm">
						Custom properties, no Tailwind, no <code>prose</code>,
						no build step of its own.
					</dd>
				</div>
			</dl>
		</section>
	</main>
);

export default Page;

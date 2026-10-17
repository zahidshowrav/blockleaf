import { Braces, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { BlockleafLogo } from '@/components/brand/blockleaf-logo';
import { CopyButton } from '@/components/copy-button';
import { docsRoute } from '@/lib/shared';

const INSTALL = 'npm i @blockleaf/editor';

export const Hero = () => (
	<section className="relative mx-auto max-w-5xl px-4 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
		<div className="border-bl-accent-edge bg-bl-accent-bg text-bl-accent-soft mb-8 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-semibold shadow-[0_0_20px_rgba(52,211,153,0.2)]">
			<BlockleafLogo size={18} />
			<span>MIT · Built on Tiptap · Versioned JSON</span>
		</div>

		<h1 className="text-bl-text mx-auto max-w-4xl text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
			A block editor that hands you{' '}
			<span className="text-bl-accent decoration-bl-accent-edge underline decoration-wavy decoration-2 drop-shadow-[0_0_24px_rgba(52,211,153,0.5)]">
				JSON.
			</span>
		</h1>

		<p className="text-bl-dim mx-auto mt-6 max-w-2xl text-base leading-relaxed font-normal sm:text-xl">
			Notion-style editing on Tiptap — slash menu, drag handles, tables,
			uploads. No CSS framework, no opinion about where your content
			lives, and a renderer for the server in the box.
		</p>

		<div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
			<Link
				href={docsRoute}
				className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-mono text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.4)] transition-all hover:bg-emerald-400"
			>
				<span>Get started</span>
				<ChevronRight
					className="size-4 stroke-[3]"
					aria-hidden="true"
				/>
			</Link>

			<Link
				href={`${docsRoute}/schema`}
				className="border-bl-line bg-bl-head text-bl-text hover:border-bl-accent-edge flex items-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-semibold shadow-md transition-all"
			>
				<Braces
					className="text-bl-accent size-4"
					aria-hidden="true"
				/>
				<span>The JSON contract</span>
			</Link>

			<div className="border-bl-line bg-bl-deep text-bl-text flex items-center rounded-xl border px-4 py-3 font-mono text-xs shadow-inner">
				<span
					aria-hidden="true"
					className="text-bl-accent mr-2 font-bold"
				>
					$
				</span>
				<code>{INSTALL}</code>
				<CopyButton
					value={INSTALL}
					label="install command"
					className="ml-3"
				/>
			</div>
		</div>
	</section>
);

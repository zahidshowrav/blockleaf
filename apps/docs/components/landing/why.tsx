import { Braces, Database, Layers, Server } from 'lucide-react';

import { BlockleafLogo } from '@/components/brand/blockleaf-logo';

const reasons = [
	{
		icon: Braces,
		title: 'Versioned JSON',
		body: 'Every document carries a schema version, and every change to the stored shape ships a migration. Your database stays reliable forever.'
	},
	{
		icon: Server,
		title: 'Server rendering included',
		body: '@blockleaf/renderer turns stored JSON into React or static HTML with no editor and no ProseMirror weight.'
	},
	{
		icon: Layers,
		title: 'One stylesheet',
		body: 'Custom properties, no Tailwind requirement, no prose plugin, no build step of its own. It inherits your design tokens.'
	},
	{
		icon: Database,
		title: 'Headless & unopinionated',
		body: 'Store in Postgres jsonb, SQLite, MongoDB or flat files. No proprietary backend lock-in, no mandatory cloud sync.'
	}
];

export const Why = () => (
	<section
		id="contract-section"
		className="relative mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8"
	>
		<div className="mx-auto mb-16 max-w-2xl text-center">
			<div className="border-bl-accent-edge bg-bl-accent-bg text-bl-accent mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-widest uppercase">
				<BlockleafLogo size={14} />
				<span>Why Blockleaf</span>
			</div>
			<h2 className="text-bl-text text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
				A block editor that respects your data layer
			</h2>
		</div>

		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{reasons.map((reason) => (
				<div
					key={reason.title}
					className="border-bl-line from-bl-panel to-bl-bg hover:border-bl-accent-edge rounded-2xl border bg-linear-to-b p-6 transition-all hover:shadow-[0_0_25px_rgba(52,211,153,0.15)]"
				>
					<div className="border-bl-accent-edge bg-bl-accent-bg text-bl-accent mb-5 flex size-12 items-center justify-center rounded-xl border">
						<reason.icon
							className="size-6"
							aria-hidden="true"
						/>
					</div>
					<h3 className="text-bl-text mb-2 text-lg font-bold">
						{reason.title}
					</h3>
					<p className="text-bl-faint text-xs leading-relaxed">
						{reason.body}
					</p>
				</div>
			))}
		</div>
	</section>
);

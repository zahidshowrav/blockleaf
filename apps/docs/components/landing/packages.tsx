'use client';

import { useState } from 'react';

import { CopyButton } from '@/components/copy-button';

const managers = ['npm', 'pnpm', 'yarn', 'bun'] as const;

type Manager = (typeof managers)[number];

const verb: Record<Manager, string> = {
	npm: 'npm install',
	pnpm: 'pnpm add',
	yarn: 'yarn add',
	bun: 'bun add'
};

const packages = [
	{
		name: '@blockleaf/editor',
		blurb: 'The primary interactive block editor React component.'
	},
	{
		name: '@blockleaf/renderer',
		blurb: 'Ultra-lightweight server renderer for headless display.'
	}
];

export const Packages = () => {
	const [manager, setManager] = useState<Manager>('npm');

	return (
		<section className="relative mx-auto max-w-5xl px-4 sm:px-6">
			<div className="border-bl-line bg-bl-panel rounded-2xl border p-8 shadow-2xl">
				<div className="border-bl-line flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
					<div>
						<h2 className="text-bl-text text-lg font-bold">
							Official npm packages
						</h2>
						<p className="text-bl-faint mt-0.5 text-xs">
							Install modularly according to your client and
							server architecture.
						</p>
					</div>

					<div
						role="tablist"
						aria-label="Package manager"
						className="border-bl-line bg-bl-bg flex items-center rounded-xl border p-1 font-mono text-xs font-medium"
					>
						{managers.map((option) => (
							<button
								key={option}
								type="button"
								role="tab"
								aria-selected={manager === option}
								onClick={() => setManager(option)}
								className="text-bl-faint hover:text-bl-text aria-selected:bg-emerald-500 aria-selected:font-bold aria-selected:text-slate-950 aria-selected:shadow-[0_0_12px_rgba(52,211,153,0.3)] rounded-lg px-3.5 py-1.5 transition-colors"
							>
								{option}
							</button>
						))}
					</div>
				</div>

				<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
					{packages.map((entry) => {
						const command = `${verb[manager]} ${entry.name}`;

						return (
							<div
								key={entry.name}
								className="border-bl-line bg-bl-head flex flex-col justify-between rounded-xl border p-5"
							>
								<div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-bl-text font-mono text-xs font-bold">
											{entry.name}
										</span>
										<span className="border-bl-accent-edge bg-bl-accent-bg text-bl-accent-soft rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
											ESM only
										</span>
									</div>
									<p className="text-bl-faint mt-2 text-xs">
										{entry.blurb}
									</p>
								</div>

								<div className="border-bl-line bg-bl-bg text-bl-accent-soft mt-5 flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 font-mono text-xs">
									<code className="truncate">{command}</code>
									<CopyButton
										value={command}
										label={`${entry.name} install command`}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

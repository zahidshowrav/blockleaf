'use client';

import { ShieldCheck, Terminal } from 'lucide-react';
import { useState } from 'react';

import { BlockleafEditor, type BlockleafDocument } from '@blockleaf/editor';
import { RenderDocument } from '@blockleaf/renderer/react';

import { BlockleafLogo } from '@/components/brand/blockleaf-logo';
import { CopyButton } from '@/components/copy-button';
import { demoDocument } from '@/components/demo-document';
import { JsonPane } from '@/components/landing/json-pane';

const panes = [
	{ id: 'json', label: 'Schema Output' },
	{ id: 'render', label: 'Server render' }
] as const;

type PaneId = (typeof panes)[number]['id'];

/**
 * The landing page's whole argument, above the fold: a real editor on the
 * left and, on the right, what it hands your database — plus the same
 * document back through `@blockleaf/renderer`, with no editor and no
 * ProseMirror.
 *
 * No screenshot and no video, because the claim being made is that the thing
 * works and gives you clean JSON, and both are checkable here in seconds.
 */
export const DemoPanel = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(demoDocument);
	const [pane, setPane] = useState<PaneId>('json');

	const json = JSON.stringify(doc, null, 2);

	return (
		<section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div className="border-bl-line bg-bl-panel/90 overflow-hidden rounded-2xl border shadow-[0_10px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl dark:shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
				<div className="border-bl-line bg-bl-head flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
					<div className="flex items-center gap-3">
						<div
							aria-hidden="true"
							className="flex gap-1.5"
						>
							<div className="size-3 rounded-full bg-rose-500/80" />
							<div className="size-3 rounded-full bg-amber-500/80" />
							<div className="size-3 rounded-full bg-emerald-500/80" />
						</div>
						<div className="text-bl-dim ml-2 flex items-center gap-2 font-mono text-xs font-medium">
							<Terminal
								className="text-bl-accent size-3.5"
								aria-hidden="true"
							/>
							<span>workspace / interactive-editor.tsx</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="border-bl-accent-edge bg-bl-accent-bg text-bl-accent-soft flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px]">
							<span
								aria-hidden="true"
								className="relative flex size-2"
							>
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
							</span>
							<span>live</span>
						</div>
						<span className="text-bl-faint border-bl-line bg-bl-deep rounded border px-2 py-1 font-mono text-[11px]">
							schemaVersion: 1
						</span>
					</div>
				</div>

				<div className="grid min-h-[500px] grid-cols-1 lg:grid-cols-12">
					<div className="border-bl-line from-bl-panel to-bl-head flex flex-col border-b bg-linear-to-b lg:col-span-7 lg:border-r lg:border-b-0">
						<div className="border-bl-line flex items-center justify-between border-b px-6 py-3 sm:px-8">
							<div className="text-bl-accent flex items-center justify-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase">
								<BlockleafLogo size={16} />
								<span>Blockleaf Surface</span>
							</div>
						</div>

						<div className="h-[26rem] overflow-auto">
							<BlockleafEditor
								className="min-h-full px-6 py-4 sm:px-8"
								defaultValue={demoDocument}
								onChangeImmediate={setDoc}
							/>
						</div>

						<div className="border-bl-line text-bl-faint flex items-center justify-between border-t px-6 py-3 font-mono text-xs sm:px-8">
							<span>
								Select words for the toolbar · Press{' '}
								<kbd className="border-bl-line bg-bl-deep text-bl-accent-soft rounded border px-1.5 py-0.5 text-[11px]">
									/
								</kbd>
							</span>
							<span className="text-bl-accent font-semibold">
								Tiptap Engine
							</span>
						</div>
					</div>

					<div className="bg-bl-deep text-bl-text flex flex-col lg:col-span-5">
						<div className="border-bl-line flex items-center justify-between border-b px-6 py-2.5 sm:px-8">
							<div
								role="tablist"
								aria-label="Document output"
								className="flex items-center gap-2"
							>
								{panes.map((option) => (
									<button
										key={option.id}
										type="button"
										role="tab"
										aria-selected={pane === option.id}
										onClick={() => setPane(option.id)}
										className="text-bl-faint aria-selected:border-bl-accent-edge aria-selected:bg-bl-accent-bg aria-selected:text-bl-accent-soft hover:text-bl-dim rounded-md border border-transparent px-3 py-1 font-mono text-xs font-medium transition-colors"
									>
										{option.label}
									</button>
								))}
							</div>

							{pane === 'json' ? (
								<CopyButton
									value={json}
									label="JSON document"
								/>
							) : null}
						</div>

						<div className="h-[26rem] overflow-auto px-6 py-4 sm:px-8">
							{pane === 'json' ? (
								<JsonPane json={json} />
							) : (
								<div className="blockleaf-editor">
									<div className="blockleaf-editor__content">
										<RenderDocument doc={doc} />
									</div>
								</div>
							)}
						</div>

						<div className="border-bl-line text-bl-faint flex items-center justify-between border-t px-6 py-3 text-xs sm:px-8">
							<span className="text-bl-accent flex items-center gap-1.5 font-medium">
								<ShieldCheck
									className="size-4"
									aria-hidden="true"
								/>
								Guaranteed schemaVersion invariant
							</span>
							<span className="font-mono text-[11px]">
								application/json
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

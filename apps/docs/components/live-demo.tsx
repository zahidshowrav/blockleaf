'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { BlockleafEditor, type BlockleafDocument } from '@blockleaf/editor';
import { RenderDocument } from '@blockleaf/renderer/react';

import { demoDocument } from '@/components/demo-document';

const tabs = [
	{
		id: 'editor',
		label: 'Blockleaf editor',
		caption: 'A real editor — type in it, and the other two tabs follow.'
	},
	{
		id: 'render',
		label: 'Server render',
		caption:
			'The same document through @blockleaf/renderer: no editor, no ProseMirror, no client JavaScript.'
	},
	{
		id: 'json',
		label: 'Output document',
		caption: 'What lands in your database. This is the product.'
	}
] as const;

type TabId = (typeof tabs)[number]['id'];

/**
 * The landing page's whole argument, above the fold: a real editor, the markup
 * a server would send for what it produced, and the JSON that gets stored.
 *
 * No screenshot and no video, because the claim being made is that the thing
 * works and gives you clean JSON, and all of that is checkable here in about
 * four seconds.
 *
 * Every panel stays mounted — switching tabs must not reset the caret, the
 * undo history or the document — and the box has a fixed height, so neither
 * typing nor switching tabs moves the page underneath it.
 */
export const LiveDemo = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(demoDocument);
	const [active, setActive] = useState<TabId>('editor');
	const triggers = useRef<(HTMLButtonElement | null)[]>([]);
	const baseId = useId();
	const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

	const focusTab = (index: number) => {
		const position = (index + tabs.length) % tabs.length;
		const tab = tabs[position];
		if (!tab) return;

		setActive(tab.id);
		triggers.current[position]?.focus();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const current = tabs.findIndex((tab) => tab.id === active);

		if (event.key === 'ArrowRight') focusTab(current + 1);
		else if (event.key === 'ArrowLeft') focusTab(current - 1);
		else if (event.key === 'Home') focusTab(0);
		else if (event.key === 'End') focusTab(tabs.length - 1);
		else return;

		event.preventDefault();
	};

	return (
		<div className="border-fd-border bg-fd-card w-full overflow-hidden rounded-xl border">
			<div
				role="tablist"
				aria-label="Blockleaf demo"
				onKeyDown={onKeyDown}
				className="border-fd-border flex gap-1 border-b p-1.5"
			>
				{tabs.map((tab, index) => (
					<button
						key={tab.id}
						ref={(node) => {
							triggers.current[index] = node;
						}}
						type="button"
						role="tab"
						id={`${baseId}-${tab.id}-tab`}
						aria-selected={active === tab.id}
						aria-controls={`${baseId}-${tab.id}-panel`}
						tabIndex={active === tab.id ? 0 : -1}
						onClick={() => setActive(tab.id)}
						className="text-fd-muted-foreground hover:text-fd-accent-foreground aria-selected:bg-fd-muted aria-selected:text-fd-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
					>
						{tab.label}
					</button>
				))}
			</div>

			<p className="text-fd-muted-foreground border-fd-border flex h-9 items-center truncate border-b px-4 font-mono text-xs">
				{activeTab.caption}
			</p>

			<div className="h-[30rem]">
				{tabs.map((tab) => (
					<div
						key={tab.id}
						role="tabpanel"
						id={`${baseId}-${tab.id}-panel`}
						aria-labelledby={`${baseId}-${tab.id}-tab`}
						hidden={active !== tab.id}
						tabIndex={tab.id === 'editor' ? undefined : 0}
						className="h-full overflow-auto"
					>
						{tab.id === 'editor' && (
							<BlockleafEditor
								className="min-h-full px-4 py-3"
								defaultValue={demoDocument}
								onChangeImmediate={setDoc}
							/>
						)}

						{tab.id === 'render' && (
							<div className="blockleaf-editor min-h-full px-4 py-3">
								<div className="blockleaf-editor__content">
									<RenderDocument doc={doc} />
								</div>
							</div>
						)}

						{tab.id === 'json' && (
							<pre className="p-4 text-xs leading-relaxed">
								<code>{JSON.stringify(doc, null, 2)}</code>
							</pre>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

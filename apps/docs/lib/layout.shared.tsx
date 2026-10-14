import type { BaseLayoutProps, LinkItemType } from 'fumadocs-ui/layouts/shared';
import {
	Braces,
	CircleQuestionMark,
	MousePointerClick,
	Palette,
	Server
} from 'lucide-react';

import { appName, docsRoute, gitConfig } from '@/lib/shared';

/**
 * The navbar dropdown, which only exists on the navbar: on a docs page the
 * sidebar already carries the page tree, and in the mobile menu the plain
 * `Documentation` link below stands in for it.
 */
const documentation: LinkItemType = {
	type: 'menu',
	text: 'Documentation',
	url: docsRoute,
	on: 'nav',
	items: [
		{
			text: 'Quick start',
			description:
				'Install the editor, render it, and store what it hands you — in about ten lines.',
			url: docsRoute,
			menu: {
				className: 'md:row-span-2',
				banner: (
					<div className="from-fd-primary/10 to-fd-card border-fd-border -mx-3 -mt-3 mb-1 flex h-28 items-center justify-center rounded-t-lg border-b bg-linear-to-br px-3">
						<code className="text-fd-muted-foreground text-xs break-all">
							{
								'{ "type": "doc", "attrs": { "schemaVersion": 1 } }'
							}
						</code>
					</div>
				)
			}
		},
		{
			icon: <CircleQuestionMark />,
			text: 'What is Blockleaf',
			description:
				'Why it exists next to Tiptap and Novel, and what it refuses to decide for you.',
			url: `${docsRoute}/what-is-blockleaf`
		},
		{
			icon: <Braces />,
			text: 'The JSON contract',
			description:
				'Every node and mark the editor can store, and what a version bump promises.',
			url: `${docsRoute}/schema`
		},
		{
			icon: <MousePointerClick />,
			text: 'Editor chrome',
			description:
				'The slash menu, selection toolbar and drag handles — and how to replace them.',
			url: `${docsRoute}/chrome`
		},
		{
			icon: <Server />,
			text: 'Server rendering',
			description:
				'Turn stored JSON into React or HTML with no editor and no ProseMirror.',
			url: `${docsRoute}/rendering`
		},
		{
			icon: <Palette />,
			text: 'The style guide',
			description:
				'One stylesheet and fifty-seven custom properties — with Tailwind and shadcn/ui recipes.',
			url: `${docsRoute}/styling`,
			menu: {
				className:
					'md:col-span-2 lg:col-span-3 md:flex-row md:items-center'
			}
		}
	]
};

export const baseOptions = (): BaseLayoutProps => ({
	nav: {
		title: (
			<>
				<span aria-hidden="true">🍃</span>
				<span className="font-semibold">{appName}</span>
			</>
		)
	},
	links: [
		documentation,
		{ text: 'Documentation', url: docsRoute, on: 'menu' },
		{
			text: 'Examples',
			url: `${docsRoute}/examples`,
			active: 'nested-url'
		},
		{ text: 'Blog', url: '/blog', active: 'nested-url' }
	],
	githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`
});

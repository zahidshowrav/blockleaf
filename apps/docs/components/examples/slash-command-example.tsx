'use client';

import { BlockleafEditor, type SlashCommand } from '@blockleaf/editor';

import { ExampleFrame } from '@/components/examples/example-frame';

const today: SlashCommand = {
	id: 'today',
	title: "Today's date",
	description: 'Insert the date as plain text',
	group: 'Advanced',
	keywords: ['date', 'now'],
	run: (editor) =>
		editor
			.chain()
			.focus()
			.insertContent(
				new Date().toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			)
			.run()
};

/** One command appended to the defaults, and one removed. */
export const SlashCommandExample = () => (
	<ExampleFrame caption="press / — “Today’s date” is new, “Callout” is gone">
		<BlockleafEditor
			className="min-h-full px-4 py-3"
			placeholder="Press / to open the menu…"
			slashItems={(defaults) => [
				...defaults.filter((command) => command.id !== 'callout'),
				today
			]}
		/>
	</ExampleFrame>
);

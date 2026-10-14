import { SCHEMA_VERSION, type BlockleafDocument } from '@blockleaf/editor';

/**
 * What the demo starts with. It is deliberately a tour rather than lorem
 * ipsum: every block in it is one the reader might doubt the editor has.
 */
export const demoDocument: BlockleafDocument = {
	type: 'doc',
	attrs: { schemaVersion: SCHEMA_VERSION },
	content: [
		{
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: 'Try it' }]
		},
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'This is a real editor. Type in it. ' },
				{
					type: 'text',
					marks: [{ type: 'bold' }],
					text: 'Select some words'
				},
				{
					type: 'text',
					text: ' for the toolbar, press '
				},
				{ type: 'text', marks: [{ type: 'code' }], text: '/' },
				{
					type: 'text',
					text: ' on an empty line for the block menu, or drag a block by its handle.'
				}
			]
		},
		{
			type: 'callout',
			attrs: { emoji: '🍃', tone: 'info' },
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Everything you do here changes the JSON on the right. That JSON is the product — it is what lands in your database.'
						}
					]
				}
			]
		},
		{
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: [
								{ type: 'text', text: 'Lists, ' },
								{
									type: 'text',
									marks: [{ type: 'italic' }],
									text: 'marks'
								},
								{ type: 'text', text: ', and ' },
								{
									type: 'text',
									marks: [
										{
											type: 'link',
											attrs: {
												href: 'https://github.com/zahidshowrav/blockleaf'
											}
										}
									],
									text: 'links'
								}
							]
						}
					]
				},
				{
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: [
								{
									type: 'text',
									text: 'Tables, images, callouts, task lists'
								}
							]
						}
					]
				}
			]
		},
		{
			type: 'taskList',
			content: [
				{
					type: 'taskItem',
					attrs: { checked: true },
					content: [
						{
							type: 'paragraph',
							content: [
								{ type: 'text', text: 'Ship versioned JSON' }
							]
						}
					]
				},
				{
					type: 'taskItem',
					attrs: { checked: false },
					content: [
						{
							type: 'paragraph',
							content: [
								{
									type: 'text',
									text: 'Tick this box and watch the JSON change'
								}
							]
						}
					]
				}
			]
		}
	]
};

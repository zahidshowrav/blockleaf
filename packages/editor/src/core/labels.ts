import { HEADING_LEVELS } from './constants.js';

/**
 * Every string the editor and its default chrome put on screen.
 *
 * HD-02. The chrome is replaceable, but replacing all of it to change one
 * word is not a translation story — so each surface takes its strings from
 * here, and a host hands in as many or as few as it wants.
 *
 * Shapes rather than a flat key space: a translator sees what belongs
 * together, and TypeScript names every key that exists. Anything not given
 * falls back to the English default, so a partial translation is a valid one.
 */

/** Ids are stable; the titles are not. The same map names a block in the slash menu and in the block menu's "Turn into" group. */
export type BlockTypeId =
	| 'paragraph'
	| 'heading-1'
	| 'heading-2'
	| 'heading-3'
	| 'bullet-list'
	| 'ordered-list'
	| 'task-list'
	| 'blockquote'
	| 'code-block'
	| 'callout'
	| 'divider'
	| 'table'
	| 'image';

export type BlockTypeLabels = Record<BlockTypeId, string>;

export type SlashMenuLabels = {
	/** Accessible name of the menu itself. */
	menu: string;
	/** The headings the items are grouped under. */
	groups: Record<'basic' | 'headings' | 'lists' | 'advanced', string>;
	/** The second line under each item's title. */
	descriptions: Record<BlockTypeId, string>;
	/** Accessible name of the table size picker. */
	tableSize: string;
	/** Accessible name of one cell in that picker. */
	tableSizeCell: (rows: number, columns: number) => string;
	/** Announced as the picked size changes. */
	tableSizeSummary: (rows: number, columns: number) => string;
};

export type BubbleMenuLabels = {
	/** Accessible name of the toolbar. */
	toolbar: string;
	actions: Record<
		'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight',
		string
	>;
};

export type BlockMenuLabels = {
	/** Accessible name of the menu. */
	menu: string;
	/** Accessible name of the handle that opens it. */
	handle: string;
	/** The handle's tooltip, which says what dragging does. */
	handleHint: string;
	/** The `+` button beside the handle. */
	insert: string;
	groups: Record<'turnInto' | 'actions', string>;
	actions: Record<'move-up' | 'move-down' | 'duplicate' | 'delete', string>;
};

export type TableActionId =
	| 'add-row-before'
	| 'add-row-after'
	| 'add-column-before'
	| 'add-column-after'
	| 'toggle-header-row'
	| 'toggle-header-column'
	| 'toggle-header-cell'
	| 'merge-cells'
	| 'split-cell'
	| 'delete-row'
	| 'delete-column'
	| 'delete-table';

export type TableLabels = {
	rowActions: string;
	columnActions: string;
	/** Accessible name of the toolbar shown over selected cells. */
	cellMenu: string;
	actions: Record<TableActionId, string>;
};

export type ImageLabels = {
	actions: Record<
		'align-left' | 'align-center' | 'align-right' | 'delete-image',
		string
	>;
	/** Accessible name of the alt text field. */
	altText: string;
	/** Shown in the alt text field while it is empty. */
	altPlaceholder: string;
	/** The button that commits the alt text. */
	applyAlt: string;
	/** Accessible name of the image toolbar. */
	toolbar: string;
	/** The panel button, when the image has no description yet. */
	addAlt: string;
	/** The same button, when it already has one. */
	editAlt: string;
};

export type LinkLabels = {
	/** Accessible name of the address field. */
	address: string;
	/** Shown in the address field while it is empty. */
	placeholder: string;
	apply: string;
	open: string;
	remove: string;
};

export type UploadLabels = {
	uploading: (fileName: string) => string;
	failed: (fileName: string) => string;
	cancel: string;
	retry: string;
	dismiss: string;
};

export type CodeBlockLabels = {
	/** Accessible name of the language select. */
	language: string;
	/** The entry that means "no highlighting". */
	plainText: string;
};

export type PlaceholderLabels = {
	/** Shown in an empty paragraph. */
	paragraph?: string;
	/** Shown in an empty heading, by level. */
	heading?: (level: number) => string;
	/** Shown in any other empty block that has no label of its own. */
	fallback?: string;
};

export type ResolvedLabels = {
	blockTypes: BlockTypeLabels;
	slashMenu: SlashMenuLabels;
	bubbleMenu: BubbleMenuLabels;
	blockMenu: BlockMenuLabels;
	table: TableLabels;
	image: ImageLabels;
	link: LinkLabels;
	upload: UploadLabels;
	codeBlock: CodeBlockLabels;
	placeholder: Required<PlaceholderLabels>;
};

/** What a host hands in: any subset, at any depth that has a default under it. */
export type BlockleafLabels = {
	blockTypes?: Partial<BlockTypeLabels>;
	slashMenu?: Partial<Omit<SlashMenuLabels, 'groups' | 'descriptions'>> & {
		groups?: Partial<SlashMenuLabels['groups']>;
		descriptions?: Partial<SlashMenuLabels['descriptions']>;
	};
	bubbleMenu?: Partial<Omit<BubbleMenuLabels, 'actions'>> & {
		actions?: Partial<BubbleMenuLabels['actions']>;
	};
	blockMenu?: Partial<Omit<BlockMenuLabels, 'groups' | 'actions'>> & {
		groups?: Partial<BlockMenuLabels['groups']>;
		actions?: Partial<BlockMenuLabels['actions']>;
	};
	table?: Partial<Omit<TableLabels, 'actions'>> & {
		actions?: Partial<TableLabels['actions']>;
	};
	image?: Partial<Omit<ImageLabels, 'actions'>> & {
		actions?: Partial<ImageLabels['actions']>;
	};
	link?: Partial<LinkLabels>;
	upload?: Partial<UploadLabels>;
	codeBlock?: Partial<CodeBlockLabels>;
	placeholder?: PlaceholderLabels;
};

export const defaultPlaceholderLabels: Required<PlaceholderLabels> = {
	paragraph: "Type '/' for commands",
	heading: (level) =>
		HEADING_LEVELS.includes(level as (typeof HEADING_LEVELS)[number])
			? `Heading ${level}`
			: 'Heading',
	fallback: ''
};

export const defaultLabels: ResolvedLabels = {
	blockTypes: {
		paragraph: 'Text',
		'heading-1': 'Heading 1',
		'heading-2': 'Heading 2',
		'heading-3': 'Heading 3',
		'bullet-list': 'Bullet list',
		'ordered-list': 'Numbered list',
		'task-list': 'To-do list',
		blockquote: 'Quote',
		'code-block': 'Code',
		callout: 'Callout',
		divider: 'Divider',
		table: 'Table',
		image: 'Image'
	},
	slashMenu: {
		menu: 'Slash commands',
		groups: {
			basic: 'Basic blocks',
			headings: 'Headings',
			lists: 'Lists',
			advanced: 'Advanced'
		},
		descriptions: {
			paragraph: 'Just start typing with plain text.',
			'heading-1': 'Large section heading.',
			'heading-2': 'Medium section heading.',
			'heading-3': 'Small section heading.',
			'bullet-list': 'Create a simple bulleted list.',
			'ordered-list': 'Create a list with numbering.',
			'task-list': 'Track tasks with a to-do list.',
			blockquote: 'Capture a quotation.',
			'code-block': 'Capture a code snippet.',
			callout: 'Highlight important information.',
			divider: 'Visually separate sections with a line.',
			table: 'Pick a size, with a header row.',
			image: 'Upload an image from your device.'
		},
		tableSize: 'Table size',
		tableSizeCell: (rows, columns) => `${rows} by ${columns}`,
		tableSizeSummary: (rows, columns) =>
			`Insert a ${rows} by ${columns} table`
	},
	bubbleMenu: {
		toolbar: 'Text formatting',
		actions: {
			bold: 'Bold',
			italic: 'Italic',
			underline: 'Underline',
			strike: 'Strikethrough',
			code: 'Inline code',
			highlight: 'Highlight'
		}
	},
	blockMenu: {
		menu: 'Block actions',
		handle: 'Block actions',
		handleHint: 'Drag to move, click for actions',
		insert: 'Insert a block below',
		groups: { turnInto: 'Turn into', actions: 'Actions' },
		actions: {
			'move-up': 'Move up',
			'move-down': 'Move down',
			duplicate: 'Duplicate',
			delete: 'Delete'
		}
	},
	table: {
		rowActions: 'Row actions',
		columnActions: 'Column actions',
		cellMenu: 'Cell actions',
		actions: {
			'add-row-before': 'Insert row above',
			'add-row-after': 'Insert row below',
			'add-column-before': 'Insert column left',
			'add-column-after': 'Insert column right',
			'toggle-header-row': 'Toggle header row',
			'toggle-header-column': 'Toggle header column',
			'toggle-header-cell': 'Toggle header cell',
			'merge-cells': 'Merge cells',
			'split-cell': 'Split cell',
			'delete-row': 'Delete row',
			'delete-column': 'Delete column',
			'delete-table': 'Delete table'
		}
	},
	image: {
		actions: {
			'align-left': 'Align left',
			'align-center': 'Align centre',
			'align-right': 'Align right',
			'delete-image': 'Delete image'
		},
		altText: 'Alt text',
		altPlaceholder: 'Describe this image',
		applyAlt: 'Apply alt text',
		toolbar: 'Image',
		addAlt: 'Add alt text',
		editAlt: 'Edit alt text'
	},
	link: {
		address: 'Link address',
		placeholder: 'Paste or type a link',
		apply: 'Apply link',
		open: 'Open link in a new tab',
		remove: 'Remove link'
	},
	upload: {
		uploading: (fileName) => `Uploading ${fileName}…`,
		failed: (fileName) => `Could not upload ${fileName}.`,
		cancel: 'Cancel',
		retry: 'Retry',
		dismiss: 'Dismiss'
	},
	codeBlock: {
		language: 'Code language',
		plainText: 'Plain text'
	},
	placeholder: defaultPlaceholderLabels
};

/**
 * Fills in everything the host left out.
 *
 * Merged a level at a time rather than deeply and generically: the shape is
 * known, so a hand-written merge says exactly which keys nest and keeps the
 * result typed without a cast.
 */
export const resolveLabels = (labels?: BlockleafLabels): ResolvedLabels => ({
	blockTypes: { ...defaultLabels.blockTypes, ...labels?.blockTypes },
	slashMenu: {
		...defaultLabels.slashMenu,
		...labels?.slashMenu,
		groups: {
			...defaultLabels.slashMenu.groups,
			...labels?.slashMenu?.groups
		},
		descriptions: {
			...defaultLabels.slashMenu.descriptions,
			...labels?.slashMenu?.descriptions
		}
	},
	bubbleMenu: {
		...defaultLabels.bubbleMenu,
		...labels?.bubbleMenu,
		actions: {
			...defaultLabels.bubbleMenu.actions,
			...labels?.bubbleMenu?.actions
		}
	},
	blockMenu: {
		...defaultLabels.blockMenu,
		...labels?.blockMenu,
		groups: {
			...defaultLabels.blockMenu.groups,
			...labels?.blockMenu?.groups
		},
		actions: {
			...defaultLabels.blockMenu.actions,
			...labels?.blockMenu?.actions
		}
	},
	table: {
		...defaultLabels.table,
		...labels?.table,
		actions: { ...defaultLabels.table.actions, ...labels?.table?.actions }
	},
	image: {
		...defaultLabels.image,
		...labels?.image,
		actions: { ...defaultLabels.image.actions, ...labels?.image?.actions }
	},
	link: { ...defaultLabels.link, ...labels?.link },
	upload: { ...defaultLabels.upload, ...labels?.upload },
	codeBlock: { ...defaultLabels.codeBlock, ...labels?.codeBlock },
	placeholder: { ...defaultLabels.placeholder, ...labels?.placeholder }
});

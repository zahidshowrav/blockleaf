import { HEADING_LEVELS } from './constants.js';
import { formatFileSize } from './media-src.js';

/**
 * Every string the editor and its default chrome put on screen.
 *
 * The chrome is replaceable, but replacing all of it to change one
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
	| 'toggle'
	| 'divider'
	| 'table'
	| 'image'
	| 'video'
	| 'audio'
	| 'file'
	| 'table-of-contents';

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
		| 'bold'
		| 'italic'
		| 'underline'
		| 'strike'
		| 'code'
		| 'highlight'
		| 'subscript'
		| 'superscript',
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
	groups: Record<'turnInto' | 'align' | 'actions', string>;
	actions: Record<
		| 'move-up'
		| 'move-down'
		| 'duplicate'
		| 'delete'
		| 'align-left'
		| 'align-center'
		| 'align-right'
		| 'align-justify',
		string
	>;
};

export type TableActionId =
	| 'add-row-before'
	| 'add-row-after'
	| 'add-column-before'
	| 'add-column-after'
	| 'toggle-header-row'
	| 'toggle-header-column'
	| 'toggle-header-cell'
	| 'toggle-caption'
	| 'merge-cells'
	| 'split-cell'
	| 'delete-row'
	| 'delete-column'
	| 'delete-table';

export type TableLabels = {
	rowActions: string;
	columnActions: string;
	/** Announced as the caret moves from one cell to another. */
	cellPosition: (
		row: number,
		column: number,
		rows: number,
		columns: number
	) => string;
	/** Accessible name of the scrollable box a table sits in. */
	scrollRegion: string;
	/** Accessible name of a header cell nobody has typed in yet. */
	emptyHeader: string;
	/** Accessible name of the toolbar shown over selected cells. */
	cellMenu: string;
	actions: Record<TableActionId, string>;
};

export type ImageLabels = {
	actions: Record<
		| 'align-left'
		| 'align-center'
		| 'align-right'
		| 'full-width'
		| 'toggle-caption'
		| 'delete-image',
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

export type CaptionLabels = {
	/** Accessible name of the caption toolbar. */
	toolbar: string;
	actions: Record<
		'align-left' | 'align-center' | 'align-right' | 'remove-caption',
		string
	>;
};

export type MediaLabels = {
	/** Accessible name of the toolbar for a selected video, audio clip or file. */
	toolbar: string;
	actions: Record<
		| 'align-left'
		| 'align-center'
		| 'align-right'
		| 'full-width'
		| 'toggle-caption'
		| 'delete',
		string
	>;
	/** A file's size as shown on its block, from a byte count. */
	fileSize: (bytes: number) => string;
	/** Accessible name of an audio player with no title. */
	audio: string;
	/** Accessible name of a video player. */
	video: string;
	/** Accessible name of a file block: its name and size, if known. */
	file: (name: string, size: string) => string;
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
	/** Shown in an empty caption, under a table or an image. */
	caption?: string;
	/** Shown in any other empty block that has no label of its own. */
	fallback?: string;
};

export type UnknownContentLabels = {
	/** Shown in place of a block this editor cannot show. Gets its type name. */
	block: (type: string) => string;
	/** Shown in place of an inline node this editor cannot show. */
	inline: (type: string) => string;
};

export type DetailsLabels = {
	/** Accessible name of the button that opens and closes a toggle. Its open state is announced by `aria-expanded`, not by the name. */
	toggle: string;
};

export type TableOfContentsLabels = {
	/** Accessible name of the list of headings. */
	label: string;
	/** Shown in the editor while the document has no headings to list. */
	empty: string;
};

export type TextCountLabels = {
	/** The word count. */
	words: (count: number) => string;
	/** The character count. */
	characters: (count: number) => string;
	/** Either count while text is selected: what is selected, out of the total already worded. */
	selected: (selected: number, total: string) => string;
	/** Accessible name of the footer. */
	label: string;
};

export type MentionLabels = {
	/** Accessible name of the list of people or pages to mention. */
	menu: string;
	/** Shown when nothing matches what was typed. */
	empty: string;
	/** Shown while the host is still looking. */
	loading: string;
};

export type EmojiLabels = {
	/** Accessible name of the list of emoji. */
	menu: string;
	/** Shown when nothing matches what was typed. */
	empty: string;
	/** Shown while the emoji list loads, the first time the picker opens. */
	loading: string;
};

export type TextColorLabels = {
	/** The bubble-menu button that opens the palette. */
	button: string;
	/** The group of text colours. */
	text: string;
	/** The group of background colours. */
	background: string;
	/** The swatch that takes the colour off. */
	none: string;
	/** Each built-in colour's name, as announced. A host's own tokens are named by their token. */
	colors: Record<
		| 'gray'
		| 'brown'
		| 'orange'
		| 'yellow'
		| 'green'
		| 'blue'
		| 'purple'
		| 'pink'
		| 'red',
		string
	>;
};

export type FontLabels = {
	/** The bubble-menu button that opens the font panel. */
	button: string;
	/** The group of families. */
	family: string;
	/** The option that takes the style off. */
	none: string;
	/** Each built-in family's name. A host's own tokens are named by their token. */
	families: Record<'sans' | 'serif' | 'mono', string>;
	/** The group of sizes. */
	size: string;
	/** Each built-in size's name. */
	sizes: Record<'sm' | 'lg' | 'xl', string>;
};

export type ResolvedLabels = {
	blockTypes: BlockTypeLabels;
	slashMenu: SlashMenuLabels;
	bubbleMenu: BubbleMenuLabels;
	blockMenu: BlockMenuLabels;
	table: TableLabels;
	image: ImageLabels;
	caption: CaptionLabels;
	media: MediaLabels;
	link: LinkLabels;
	upload: UploadLabels;
	codeBlock: CodeBlockLabels;
	details: DetailsLabels;
	mentions: MentionLabels;
	emoji: EmojiLabels;
	tableOfContents: TableOfContentsLabels;
	textCount: TextCountLabels;
	textColor: TextColorLabels;
	font: FontLabels;
	placeholder: Required<PlaceholderLabels>;
	unknown: UnknownContentLabels;
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
	caption?: Partial<Omit<CaptionLabels, 'actions'>> & {
		actions?: Partial<CaptionLabels['actions']>;
	};
	media?: Partial<Omit<MediaLabels, 'actions'>> & {
		actions?: Partial<MediaLabels['actions']>;
	};
	link?: Partial<LinkLabels>;
	upload?: Partial<UploadLabels>;
	codeBlock?: Partial<CodeBlockLabels>;
	details?: Partial<DetailsLabels>;
	mentions?: Partial<MentionLabels>;
	emoji?: Partial<EmojiLabels>;
	tableOfContents?: Partial<TableOfContentsLabels>;
	textCount?: Partial<TextCountLabels>;
	textColor?: Partial<Omit<TextColorLabels, 'colors'>> & {
		colors?: Partial<TextColorLabels['colors']>;
	};
	font?: Partial<Omit<FontLabels, 'families' | 'sizes'>> & {
		families?: Partial<FontLabels['families']>;
		sizes?: Partial<FontLabels['sizes']>;
	};
	placeholder?: PlaceholderLabels;
	unknown?: Partial<UnknownContentLabels>;
};

export const defaultPlaceholderLabels: Required<PlaceholderLabels> = {
	paragraph: "Type '/' for commands",
	heading: (level) =>
		HEADING_LEVELS.includes(level as (typeof HEADING_LEVELS)[number])
			? `Heading ${level}`
			: 'Heading',
	caption: 'Write a caption',
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
		toggle: 'Toggle',
		divider: 'Divider',
		table: 'Table',
		image: 'Image',
		video: 'Video',
		audio: 'Audio',
		file: 'File',
		'table-of-contents': 'Table of contents'
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
			toggle: 'Hide content under a title that opens it.',
			divider: 'Visually separate sections with a line.',
			table: 'Pick a size, with a header row.',
			image: 'Upload an image from your device.',
			video: 'Upload a video from your device.',
			audio: 'Upload a sound or voice recording.',
			file: 'Attach a file to download.',
			'table-of-contents': 'List the headings, with a link to each.'
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
			highlight: 'Highlight',
			subscript: 'Subscript',
			superscript: 'Superscript'
		}
	},
	blockMenu: {
		menu: 'Block actions',
		handle: 'Block actions',
		handleHint: 'Drag to move, click for actions',
		insert: 'Insert a block below',
		groups: { turnInto: 'Turn into', align: 'Align', actions: 'Actions' },
		actions: {
			'move-up': 'Move up',
			'move-down': 'Move down',
			duplicate: 'Duplicate',
			delete: 'Delete',
			'align-left': 'Left',
			'align-center': 'Center',
			'align-right': 'Right',
			'align-justify': 'Justify'
		}
	},
	table: {
		rowActions: 'Row actions',
		columnActions: 'Column actions',
		cellPosition: (row, column, rows, columns) =>
			`Row ${row} of ${rows}, column ${column} of ${columns}`,
		scrollRegion: 'Table, scrollable',
		emptyHeader: 'Empty header',
		cellMenu: 'Cell actions',
		actions: {
			'add-row-before': 'Insert row above',
			'add-row-after': 'Insert row below',
			'add-column-before': 'Insert column left',
			'add-column-after': 'Insert column right',
			'toggle-header-row': 'Toggle header row',
			'toggle-header-column': 'Toggle header column',
			'toggle-header-cell': 'Toggle header cell',
			'toggle-caption': 'Toggle caption',
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
			'full-width': 'Full width',
			'toggle-caption': 'Toggle caption',
			'delete-image': 'Delete image'
		},
		altText: 'Alt text',
		altPlaceholder: 'Describe this image',
		applyAlt: 'Apply alt text',
		toolbar: 'Image',
		addAlt: 'Add alt text',
		editAlt: 'Edit alt text'
	},
	caption: {
		toolbar: 'Caption',
		actions: {
			'align-left': 'Align caption left',
			'align-center': 'Centre caption',
			'align-right': 'Align caption right',
			'remove-caption': 'Remove caption'
		}
	},
	media: {
		toolbar: 'Media',
		actions: {
			'align-left': 'Align left',
			'align-center': 'Align centre',
			'align-right': 'Align right',
			'full-width': 'Full width',
			'toggle-caption': 'Toggle caption',
			delete: 'Delete'
		},
		fileSize: formatFileSize,
		audio: 'Audio',
		video: 'Video',
		file: (name, size) => (size ? `${name}, ${size}` : name)
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
	details: {
		toggle: 'Show or hide content'
	},
	mentions: {
		menu: 'Suggestions',
		empty: 'No matches',
		loading: 'Searching…'
	},
	emoji: {
		menu: 'Emoji',
		empty: 'No emoji found',
		loading: 'Loading emoji…'
	},
	tableOfContents: {
		label: 'Table of contents',
		empty: 'Add a heading and it will be listed here.'
	},
	textCount: {
		words: (count) =>
			`${count.toLocaleString('en')} ${count === 1 ? 'word' : 'words'}`,
		characters: (count) =>
			`${count.toLocaleString('en')} ${count === 1 ? 'character' : 'characters'}`,
		selected: (selected, total) =>
			`${selected.toLocaleString('en')} of ${total}`,
		label: 'Word count'
	},
	textColor: {
		button: 'Color',
		text: 'Text',
		background: 'Background',
		none: 'Default',
		colors: {
			gray: 'Gray',
			brown: 'Brown',
			orange: 'Orange',
			yellow: 'Yellow',
			green: 'Green',
			blue: 'Blue',
			purple: 'Purple',
			pink: 'Pink',
			red: 'Red'
		}
	},
	font: {
		button: 'Font',
		family: 'Typeface',
		none: 'Default',
		families: { sans: 'Sans serif', serif: 'Serif', mono: 'Monospace' },
		size: 'Size',
		sizes: { sm: 'Small', lg: 'Large', xl: 'Extra large' }
	},
	placeholder: defaultPlaceholderLabels,
	unknown: {
		block: (type) => `Unsupported block: ${type}`,
		inline: (type) => `[${type}]`
	}
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
	media: {
		...defaultLabels.media,
		...labels?.media,
		actions: { ...defaultLabels.media.actions, ...labels?.media?.actions }
	},
	caption: {
		...defaultLabels.caption,
		...labels?.caption,
		actions: {
			...defaultLabels.caption.actions,
			...labels?.caption?.actions
		}
	},
	link: { ...defaultLabels.link, ...labels?.link },
	upload: { ...defaultLabels.upload, ...labels?.upload },
	codeBlock: { ...defaultLabels.codeBlock, ...labels?.codeBlock },
	details: { ...defaultLabels.details, ...labels?.details },
	mentions: { ...defaultLabels.mentions, ...labels?.mentions },
	emoji: { ...defaultLabels.emoji, ...labels?.emoji },
	tableOfContents: {
		...defaultLabels.tableOfContents,
		...labels?.tableOfContents
	},
	textCount: { ...defaultLabels.textCount, ...labels?.textCount },
	textColor: {
		...defaultLabels.textColor,
		...labels?.textColor,
		colors: {
			...defaultLabels.textColor.colors,
			...labels?.textColor?.colors
		}
	},
	font: {
		...defaultLabels.font,
		...labels?.font,
		families: { ...defaultLabels.font.families, ...labels?.font?.families },
		sizes: { ...defaultLabels.font.sizes, ...labels?.font?.sizes }
	},
	placeholder: { ...defaultLabels.placeholder, ...labels?.placeholder },
	unknown: { ...defaultLabels.unknown, ...labels?.unknown }
});

import { GridPicker } from './grid-picker.js';
import {
	BulletListIcon,
	CalloutIcon,
	CodeIcon,
	DividerIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	ImageIcon,
	OrderedListIcon,
	QuoteIcon,
	TableIcon,
	TaskListIcon,
	TextIcon
} from './icons.js';
import type { SlashCommand } from './types.js';
import { UPLOAD_EXTENSION_NAME } from '../../core/constants.js';
import {
	defaultLabels,
	type BlockTypeLabels,
	type SlashMenuLabels
} from '../../core/labels.js';

/**
 * The default command list, built against a label set.
 *
 * Titles come from `blockTypes` rather than from the slash menu's own
 * labels, because the block menu's "Turn into" group names the same blocks
 * and nobody should have to translate `Heading 1` twice.
 */
export const createSlashCommands = (
	labels: SlashMenuLabels = defaultLabels.slashMenu,
	blockTypes: BlockTypeLabels = defaultLabels.blockTypes
): SlashCommand[] => [
	{
		id: 'paragraph',
		title: blockTypes['paragraph'],
		description: labels.descriptions['paragraph'],
		aliases: ['p', 'text', 'normal'],
		group: labels.groups.basic,
		icon: TextIcon,
		keywords: ['paragraph', 'text', 'plain'],
		run: (editor) => editor.chain().focus().setParagraph().run()
	},
	{
		id: 'heading-1',
		title: blockTypes['heading-1'],
		description: labels.descriptions['heading-1'],
		aliases: ['h1', '#'],
		group: labels.groups.headings,
		icon: Heading1Icon,
		keywords: ['h1', 'heading', 'title', 'large'],
		run: (editor) => editor.chain().focus().setHeading({ level: 1 }).run()
	},
	{
		id: 'heading-2',
		title: blockTypes['heading-2'],
		description: labels.descriptions['heading-2'],
		aliases: ['h2', '##'],
		group: labels.groups.headings,
		icon: Heading2Icon,
		keywords: ['h2', 'heading', 'subtitle', 'medium'],
		run: (editor) => editor.chain().focus().setHeading({ level: 2 }).run()
	},
	{
		id: 'heading-3',
		title: blockTypes['heading-3'],
		description: labels.descriptions['heading-3'],
		aliases: ['h3', '###'],
		group: labels.groups.headings,
		icon: Heading3Icon,
		keywords: ['h3', 'heading', 'subheading', 'small'],
		run: (editor) => editor.chain().focus().setHeading({ level: 3 }).run()
	},
	{
		id: 'bullet-list',
		title: blockTypes['bullet-list'],
		description: labels.descriptions['bullet-list'],
		aliases: ['ul', 'bullet', '-'],
		group: labels.groups.lists,
		icon: BulletListIcon,
		keywords: ['bullet', 'list', 'unordered'],
		run: (editor) => editor.chain().focus().toggleBulletList().run()
	},
	{
		id: 'ordered-list',
		title: blockTypes['ordered-list'],
		description: labels.descriptions['ordered-list'],
		aliases: ['ol', 'numbered', '1.'],
		group: labels.groups.lists,
		icon: OrderedListIcon,
		keywords: ['numbered', 'list', 'ordered'],
		run: (editor) => editor.chain().focus().toggleOrderedList().run()
	},
	{
		id: 'task-list',
		title: blockTypes['task-list'],
		description: labels.descriptions['task-list'],
		aliases: ['todo', 'task', 'check', '[]'],
		group: labels.groups.lists,
		icon: TaskListIcon,
		keywords: ['todo', 'task', 'checkbox', 'checklist'],
		run: (editor) => editor.chain().focus().toggleTaskList().run()
	},
	{
		id: 'blockquote',
		title: blockTypes['blockquote'],
		description: labels.descriptions['blockquote'],
		aliases: ['quote', '>'],
		group: labels.groups.basic,
		icon: QuoteIcon,
		keywords: ['quote', 'blockquote', 'citation'],
		run: (editor) => editor.chain().focus().toggleBlockquote().run()
	},
	{
		id: 'code-block',
		title: blockTypes['code-block'],
		description: labels.descriptions['code-block'],
		aliases: ['code', '```'],
		group: labels.groups.basic,
		icon: CodeIcon,
		keywords: ['code', 'codeblock', 'snippet', 'pre'],
		run: (editor) => editor.chain().focus().toggleCodeBlock().run()
	},
	{
		id: 'callout',
		title: blockTypes['callout'],
		description: labels.descriptions['callout'],
		aliases: ['callout', 'box', 'note', ':::'],
		group: labels.groups.basic,
		icon: CalloutIcon,
		keywords: ['callout', 'note', 'box', 'alert', 'info', 'emoji'],
		run: (editor) => editor.chain().focus().toggleCallout().run()
	},
	{
		id: 'divider',
		title: blockTypes['divider'],
		description: labels.descriptions['divider'],
		aliases: ['hr', 'divider', '---', 'rule'],
		group: labels.groups.basic,
		icon: DividerIcon,
		keywords: ['divider', 'horizontal', 'rule', 'line', 'separator'],
		run: (editor) => editor.chain().focus().setHorizontalRule().run()
	},
	{
		id: 'table',
		title: blockTypes['table'],
		description: labels.descriptions['table'],
		aliases: ['table', 'grid', '|||'],
		group: labels.groups.advanced,
		icon: TableIcon,
		keywords: ['table', 'grid', 'rows', 'columns'],
		picker: GridPicker,
		// Reachable without the picker: `run` is what a host gets if it
		// renders its own menu, and what `Mod-Alt-T` already does.
		run: (editor) =>
			editor
				.chain()
				.focus()
				.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
				.run()
	},
	{
		id: 'image',
		title: blockTypes['image'],
		description: labels.descriptions['image'],
		aliases: ['image', 'img', 'photo'],
		group: labels.groups.advanced,
		icon: ImageIcon,
		keywords: ['image', 'img', 'photo', 'picture', 'upload', 'media'],
		// Drop and paste already work without the menu. This is the third
		// entry point MC-02 names, and the only one a keyboard can reach.
		isAvailable: (editor) =>
			editor.extensionManager.extensions.some(
				(extension) => extension.name === UPLOAD_EXTENSION_NAME
			),
		run: (editor) => editor.chain().focus().openUploadPicker().run()
	}
];

export const defaultSlashCommands: SlashCommand[] =
	/* @__PURE__ */ createSlashCommands();

export type AddCommandOptions = {
	before?: string;
	after?: string;
	index?: number;
};

export class CommandRegistry {
	private commands: SlashCommand[];

	constructor(initialCommands: SlashCommand[] = defaultSlashCommands) {
		this.commands = [...initialCommands];
	}

	getAll(): SlashCommand[] {
		return [...this.commands];
	}

	get(id: string): SlashCommand | undefined {
		return this.commands.find((c) => c.id === id);
	}

	add(command: SlashCommand, options?: AddCommandOptions): this {
		const existingIndex = this.commands.findIndex(
			(c) => c.id === command.id
		);
		if (existingIndex !== -1) {
			this.commands.splice(existingIndex, 1);
		}

		if (options?.before) {
			const targetIndex = this.commands.findIndex(
				(c) => c.id === options.before
			);
			if (targetIndex !== -1) {
				this.commands.splice(targetIndex, 0, command);
				return this;
			}
		}

		if (options?.after) {
			const targetIndex = this.commands.findIndex(
				(c) => c.id === options.after
			);
			if (targetIndex !== -1) {
				this.commands.splice(targetIndex + 1, 0, command);
				return this;
			}
		}

		if (typeof options?.index === 'number') {
			const clamped = Math.max(
				0,
				Math.min(options.index, this.commands.length)
			);
			this.commands.splice(clamped, 0, command);
			return this;
		}

		this.commands.push(command);
		return this;
	}

	remove(id: string): this {
		const index = this.commands.findIndex((c) => c.id === id);
		if (index !== -1) {
			this.commands.splice(index, 1);
		}
		return this;
	}

	reorder(orderedIds: string[]): this {
		const idMap = new Map(this.commands.map((c) => [c.id, c]));
		const reordered: SlashCommand[] = [];

		for (const id of orderedIds) {
			const cmd = idMap.get(id);
			if (cmd) {
				reordered.push(cmd);
				idMap.delete(id);
			}
		}

		for (const cmd of idMap.values()) {
			reordered.push(cmd);
		}

		this.commands = reordered;
		return this;
	}

	filter(rawQuery: string): SlashCommand[] {
		const query = rawQuery.trim().toLowerCase();
		if (!query) {
			return [...this.commands];
		}

		type Scored = { cmd: SlashCommand; score: number };
		const results: Scored[] = [];

		for (const cmd of this.commands) {
			const titleLower = cmd.title.toLowerCase();
			const descLower = cmd.description?.toLowerCase() ?? '';
			const aliases = cmd.aliases?.map((a) => a.toLowerCase()) ?? [];
			const keywords = cmd.keywords?.map((k) => k.toLowerCase()) ?? [];

			let score = 0;

			if (titleLower === query) {
				score = 100;
			} else if (aliases.includes(query)) {
				score = 90;
			} else if (titleLower.startsWith(query)) {
				score = 80;
			} else if (aliases.some((a) => a.startsWith(query))) {
				score = 70;
			} else if (keywords.some((k) => k === query)) {
				score = 65;
			} else if (titleLower.includes(query)) {
				score = 50;
			} else if (aliases.some((a) => a.includes(query))) {
				score = 40;
			} else if (keywords.some((k) => k.includes(query))) {
				score = 30;
			} else if (descLower.includes(query)) {
				score = 20;
			}

			if (score > 0) {
				results.push({ cmd, score });
			}
		}

		return results.sort((a, b) => b.score - a.score).map((r) => r.cmd);
	}

	clone(): CommandRegistry {
		return new CommandRegistry(this.commands);
	}
}

export const createCommandRegistry = (
	commands: SlashCommand[] = defaultSlashCommands
): CommandRegistry => {
	return new CommandRegistry(commands);
};

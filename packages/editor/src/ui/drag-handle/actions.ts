import type { Editor } from '@tiptap/core';

import {
	ArrowDownIcon,
	ArrowUpIcon,
	DuplicateIcon,
	TrashIcon
} from './icons.js';
import type { BlockAction } from './types.js';
import {
	defaultLabels,
	type BlockMenuLabels,
	type BlockTypeLabels
} from '../../core/labels.js';
import { whenNodeExists } from '../schema-guard.js';
import {
	BulletListIcon,
	CodeIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	OrderedListIcon,
	QuoteIcon,
	TaskListIcon,
	TextIcon
} from '../slash-menu/icons.js';

/** Puts the cursor inside the block so the node commands act on the right one. */
const focusBlock = (editor: Editor, pos: number) =>
	editor
		.chain()
		.focus()
		.setTextSelection(pos + 1);

const blockAt = (editor: Editor, pos: number) => editor.state.doc.nodeAt(pos);

const isBlockType = (
	editor: Editor,
	pos: number,
	name: string,
	attrs?: Record<string, unknown>
) => {
	const node = blockAt(editor, pos);
	if (!node || node.type.name !== name) return false;
	if (!attrs) return true;
	return Object.entries(attrs).every(
		([key, value]) => node.attrs[key] === value
	);
};

/**
 * Moves a top-level block one slot up or down.
 *
 * Positions are computed against the original document and mapped through the
 * delete, rather than recomputed afterwards — recomputing is where the
 * off-by-one lives.
 */
const moveBlock = (editor: Editor, pos: number, direction: -1 | 1) => {
	const { state, view } = editor;
	const node = state.doc.nodeAt(pos);
	if (!node) return;

	const from = pos;
	const to = pos + node.nodeSize;

	let target: number;
	if (direction === -1) {
		const before = state.doc.childBefore(pos);
		if (!before.node) return;
		target = before.offset;
	} else {
		const after = state.doc.childAfter(to);
		if (!after.node) return;
		target = to + after.node.nodeSize;
	}

	const tr = state.tr.delete(from, to);
	tr.insert(tr.mapping.map(target), node);
	view.dispatch(tr.scrollIntoView());
};

const canMove = (editor: Editor, pos: number, direction: -1 | 1) => {
	const node = editor.state.doc.nodeAt(pos);
	if (!node) return false;
	return direction === -1
		? Boolean(editor.state.doc.childBefore(pos).node)
		: Boolean(editor.state.doc.childAfter(pos + node.nodeSize).node);
};

const turnInto = (
	group: string,
	id: string,
	title: string,
	icon: BlockAction['icon'],
	typeName: string,
	apply: (editor: Editor, pos: number) => void,
	attrs?: Record<string, unknown>
): BlockAction => ({
	id,
	title,
	group,
	icon,
	isActive: (editor, pos) => isBlockType(editor, pos, typeName, attrs),
	isAvailable: whenNodeExists(typeName, () => true),
	run: apply
});

/**
 * The default block actions, built against a label set.
 *
 * The "Turn into" titles come from `blockTypes`, the same map the slash
 * menu names its blocks with — one translation, two surfaces.
 */
export const createBlockActions = (
	labels: BlockMenuLabels = defaultLabels.blockMenu,
	blockTypes: BlockTypeLabels = defaultLabels.blockTypes
): BlockAction[] => [
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-paragraph',
		blockTypes['paragraph'],
		TextIcon,
		'paragraph',
		(editor, pos) => focusBlock(editor, pos).setParagraph().run()
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-heading-1',
		blockTypes['heading-1'],
		Heading1Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 1 }).run(),
		{ level: 1 }
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-heading-2',
		blockTypes['heading-2'],
		Heading2Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 2 }).run(),
		{ level: 2 }
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-heading-3',
		blockTypes['heading-3'],
		Heading3Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 3 }).run(),
		{ level: 3 }
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-bullet-list',
		blockTypes['bullet-list'],
		BulletListIcon,
		'bulletList',
		(editor, pos) => focusBlock(editor, pos).toggleBulletList().run()
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-ordered-list',
		blockTypes['ordered-list'],
		OrderedListIcon,
		'orderedList',
		(editor, pos) => focusBlock(editor, pos).toggleOrderedList().run()
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-task-list',
		blockTypes['task-list'],
		TaskListIcon,
		'taskList',
		(editor, pos) => focusBlock(editor, pos).toggleTaskList().run()
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-blockquote',
		blockTypes['blockquote'],
		QuoteIcon,
		'blockquote',
		(editor, pos) => focusBlock(editor, pos).toggleBlockquote().run()
	),
	/* @__PURE__ */ turnInto(
		labels.groups.turnInto,
		'turn-code-block',
		blockTypes['code-block'],
		CodeIcon,
		'codeBlock',
		(editor, pos) => focusBlock(editor, pos).toggleCodeBlock().run()
	),
	{
		id: 'move-up',
		title: labels.actions['move-up'],
		group: labels.groups.actions,
		icon: ArrowUpIcon,
		isAvailable: (editor, pos) => canMove(editor, pos, -1),
		run: (editor, pos) => moveBlock(editor, pos, -1)
	},
	{
		id: 'move-down',
		title: labels.actions['move-down'],
		group: labels.groups.actions,
		icon: ArrowDownIcon,
		isAvailable: (editor, pos) => canMove(editor, pos, 1),
		run: (editor, pos) => moveBlock(editor, pos, 1)
	},
	{
		id: 'duplicate',
		title: labels.actions['duplicate'],
		group: labels.groups.actions,
		icon: DuplicateIcon,
		run: (editor, pos) => {
			const node = editor.state.doc.nodeAt(pos);
			if (!node) return;
			const to = pos + node.nodeSize;
			editor.view.dispatch(editor.state.tr.insert(to, node));
		}
	},
	{
		id: 'delete',
		title: labels.actions['delete'],
		group: labels.groups.actions,
		icon: TrashIcon,
		danger: true,
		run: (editor, pos) => {
			const node = editor.state.doc.nodeAt(pos);
			if (!node) return;
			editor.view.dispatch(
				editor.state.tr.delete(pos, pos + node.nodeSize)
			);
		}
	}
];

export const defaultBlockActions: BlockAction[] =
	/* @__PURE__ */ createBlockActions();

export const resolveBlockActions = (
	actions?: BlockAction[] | ((defaults: BlockAction[]) => BlockAction[]),
	defaults: BlockAction[] = defaultBlockActions
): BlockAction[] => {
	if (typeof actions === 'function') {
		return actions(defaults);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaults;
};

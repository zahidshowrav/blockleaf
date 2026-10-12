import type { Editor } from '@tiptap/core';

import {
	ArrowDownIcon,
	ArrowUpIcon,
	DuplicateIcon,
	TrashIcon
} from './icons.js';
import type { BlockAction } from './types.js';
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
	id: string,
	title: string,
	icon: BlockAction['icon'],
	typeName: string,
	apply: (editor: Editor, pos: number) => void,
	attrs?: Record<string, unknown>
): BlockAction => ({
	id,
	title,
	group: 'Turn into',
	icon,
	isActive: (editor, pos) => isBlockType(editor, pos, typeName, attrs),
	run: apply
});

export const defaultBlockActions: BlockAction[] = [
	/* @__PURE__ */ turnInto(
		'turn-paragraph',
		'Text',
		TextIcon,
		'paragraph',
		(editor, pos) => focusBlock(editor, pos).setParagraph().run()
	),
	/* @__PURE__ */ turnInto(
		'turn-heading-1',
		'Heading 1',
		Heading1Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 1 }).run(),
		{ level: 1 }
	),
	/* @__PURE__ */ turnInto(
		'turn-heading-2',
		'Heading 2',
		Heading2Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 2 }).run(),
		{ level: 2 }
	),
	/* @__PURE__ */ turnInto(
		'turn-heading-3',
		'Heading 3',
		Heading3Icon,
		'heading',
		(editor, pos) => focusBlock(editor, pos).setHeading({ level: 3 }).run(),
		{ level: 3 }
	),
	/* @__PURE__ */ turnInto(
		'turn-bullet-list',
		'Bullet list',
		BulletListIcon,
		'bulletList',
		(editor, pos) => focusBlock(editor, pos).toggleBulletList().run()
	),
	/* @__PURE__ */ turnInto(
		'turn-ordered-list',
		'Numbered list',
		OrderedListIcon,
		'orderedList',
		(editor, pos) => focusBlock(editor, pos).toggleOrderedList().run()
	),
	/* @__PURE__ */ turnInto(
		'turn-task-list',
		'To-do list',
		TaskListIcon,
		'taskList',
		(editor, pos) => focusBlock(editor, pos).toggleTaskList().run()
	),
	/* @__PURE__ */ turnInto(
		'turn-blockquote',
		'Quote',
		QuoteIcon,
		'blockquote',
		(editor, pos) => focusBlock(editor, pos).toggleBlockquote().run()
	),
	/* @__PURE__ */ turnInto(
		'turn-code-block',
		'Code',
		CodeIcon,
		'codeBlock',
		(editor, pos) => focusBlock(editor, pos).toggleCodeBlock().run()
	),
	{
		id: 'move-up',
		title: 'Move up',
		group: 'Actions',
		icon: ArrowUpIcon,
		isAvailable: (editor, pos) => canMove(editor, pos, -1),
		run: (editor, pos) => moveBlock(editor, pos, -1)
	},
	{
		id: 'move-down',
		title: 'Move down',
		group: 'Actions',
		icon: ArrowDownIcon,
		isAvailable: (editor, pos) => canMove(editor, pos, 1),
		run: (editor, pos) => moveBlock(editor, pos, 1)
	},
	{
		id: 'duplicate',
		title: 'Duplicate',
		group: 'Actions',
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
		title: 'Delete',
		group: 'Actions',
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

export const resolveBlockActions = (
	actions?: BlockAction[] | ((defaults: BlockAction[]) => BlockAction[])
): BlockAction[] => {
	if (typeof actions === 'function') {
		return actions(defaultBlockActions);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaultBlockActions;
};

import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	BlockMenu,
	createDragHandleExtension,
	defaultBlockActions,
	resolveBlockActions,
	type BlockAction
} from '../src/ui/index.js';

const editors: Editor[] = [];
const createEditor = (content: string) => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content
	});
	editors.push(editor);
	return editor;
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

/** Position before the nth top-level block. */
const blockPos = (editor: Editor, index: number) => {
	let pos = 0;
	editor.state.doc.forEach((node, offset, i) => {
		if (i === index) pos = offset;
	});
	return pos;
};

const textOf = (editor: Editor) =>
	editor.state.doc.content.content.map((node) => node.textContent);

describe('Block actions (CH-03)', () => {
	it('ships turn-into entries plus the four block operations', () => {
		const ids = defaultBlockActions.map((a) => a.id);
		expect(ids).toEqual([
			'turn-paragraph',
			'turn-heading-1',
			'turn-heading-2',
			'turn-heading-3',
			'turn-bullet-list',
			'turn-ordered-list',
			'turn-task-list',
			'turn-blockquote',
			'turn-code-block',
			'move-up',
			'move-down',
			'duplicate',
			'delete'
		]);
	});

	it('turns a paragraph into a heading and reports it as current', () => {
		const editor = createEditor('<p>One</p>');
		const pos = blockPos(editor, 0);
		const toHeading = defaultBlockActions.find(
			(a) => a.id === 'turn-heading-2'
		);

		expect(toHeading?.isActive?.(editor, pos)).toBe(false);
		toHeading?.run(editor, pos);

		expect(editor.state.doc.firstChild?.type.name).toBe('heading');
		expect(editor.state.doc.firstChild?.attrs.level).toBe(2);
		expect(toHeading?.isActive?.(editor, blockPos(editor, 0))).toBe(true);
	});

	it('moves a block up and down without losing content', () => {
		const editor = createEditor('<p>A</p><p>B</p><p>C</p>');
		const moveUp = defaultBlockActions.find((a) => a.id === 'move-up');
		const moveDown = defaultBlockActions.find((a) => a.id === 'move-down');

		moveUp?.run(editor, blockPos(editor, 2));
		expect(textOf(editor)).toEqual(['A', 'C', 'B']);

		moveDown?.run(editor, blockPos(editor, 0));
		expect(textOf(editor)).toEqual(['C', 'A', 'B']);
	});

	it('refuses to move the first block up or the last block down', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		const moveUp = defaultBlockActions.find((a) => a.id === 'move-up');
		const moveDown = defaultBlockActions.find((a) => a.id === 'move-down');

		expect(moveUp?.isAvailable?.(editor, blockPos(editor, 0))).toBe(false);
		expect(moveDown?.isAvailable?.(editor, blockPos(editor, 1))).toBe(
			false
		);
		expect(moveUp?.isAvailable?.(editor, blockPos(editor, 1))).toBe(true);
		expect(moveDown?.isAvailable?.(editor, blockPos(editor, 0))).toBe(true);
	});

	it('duplicates a block directly below itself', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		defaultBlockActions
			.find((a) => a.id === 'duplicate')
			?.run(editor, blockPos(editor, 0));

		expect(textOf(editor)).toEqual(['A', 'A', 'B']);
	});

	it('deletes a block', () => {
		const editor = createEditor('<p>A</p><p>B</p><p>C</p>');
		defaultBlockActions
			.find((a) => a.id === 'delete')
			?.run(editor, blockPos(editor, 1));

		expect(textOf(editor)).toEqual(['A', 'C']);
	});

	it('moves a table as one block, not cell by cell', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		editor.commands.setTextSelection(blockPos(editor, 1) + 1);
		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });

		const tableIndex = editor.state.doc.content.content.findIndex(
			(node) => node.type.name === 'table'
		);
		expect(tableIndex).toBeGreaterThan(-1);

		const before = editor.state.doc.childCount;
		defaultBlockActions
			.find((a) => a.id === 'move-up')
			?.run(editor, blockPos(editor, tableIndex));

		expect(editor.state.doc.childCount).toBe(before);
		expect(
			editor.state.doc.content.content[tableIndex - 1]?.type.name
		).toBe('table');
	});

	it('resolves custom actions from an array or a function', () => {
		const custom: BlockAction = {
			id: 'custom',
			title: 'Custom',
			group: 'Actions',
			run: vi.fn()
		};

		expect(resolveBlockActions([custom])).toEqual([custom]);
		expect(resolveBlockActions()).toBe(defaultBlockActions);
		expect(
			resolveBlockActions((defaults) => [...defaults, custom]).at(-1)
		).toBe(custom);
	});
});

describe('Block menu', () => {
	it('renders a labelled menu grouped into Turn into and Actions', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 1)}
				onClose={vi.fn()}
			/>
		);

		expect(
			screen.getByRole('menu', { name: 'Block actions' })
		).toBeDefined();
		expect(screen.getByRole('group', { name: 'Turn into' })).toBeDefined();
		expect(screen.getByRole('group', { name: 'Actions' })).toBeDefined();
	});

	it('hides an entry that cannot apply to this block', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 0)}
				onClose={vi.fn()}
			/>
		);

		expect(screen.queryByRole('menuitem', { name: 'Move up' })).toBeNull();
		expect(
			screen.getByRole('menuitem', { name: 'Move down' })
		).toBeDefined();
	});

	it('marks the current block type with aria-current', () => {
		const editor = createEditor('<h1>Title</h1>');
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 0)}
				onClose={vi.fn()}
			/>
		);

		expect(
			screen
				.getByRole('menuitem', { name: 'Heading 1' })
				.getAttribute('aria-current')
		).toBe('true');
		expect(
			screen
				.getByRole('menuitem', { name: 'Text' })
				.getAttribute('aria-current')
		).toBeNull();
	});

	it('runs an entry on click and closes', () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		const onClose = vi.fn();
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 1)}
				onClose={onClose}
			/>
		);

		fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
		expect(textOf(editor)).toEqual(['A']);
		expect(onClose).toHaveBeenCalled();
	});

	it('navigates with the arrow keys and runs on Enter', () => {
		const editor = createEditor('<p>A</p>');
		const onClose = vi.fn();
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 0)}
				onClose={onClose}
			/>
		);

		const menu = screen.getByRole('menu');
		expect(
			screen
				.getByRole('menuitem', { name: 'Text' })
				.getAttribute('data-active')
		).toBe('true');

		fireEvent.keyDown(menu, { key: 'ArrowDown' });
		expect(
			screen
				.getByRole('menuitem', { name: 'Heading 1' })
				.getAttribute('data-active')
		).toBe('true');

		fireEvent.keyDown(menu, { key: 'Enter' });
		expect(editor.state.doc.firstChild?.type.name).toBe('heading');
		expect(onClose).toHaveBeenCalled();
	});

	it('Escape closes without running anything', () => {
		const editor = createEditor('<p>A</p>');
		const onClose = vi.fn();
		render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 0)}
				onClose={onClose}
			/>
		);

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
		expect(onClose).toHaveBeenCalled();
		expect(editor.state.doc.firstChild?.type.name).toBe('paragraph');
	});
});

describe('Drag handle extension wiring', () => {
	it('registers under the dragHandle name', () => {
		expect(createDragHandleExtension().name).toBe('dragHandle');
	});

	it('mounts and tears down inside a real editor', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createDragHandleExtension()
			],
			content: '<p>Hello</p>'
		});

		expect(
			editor.extensionManager.extensions.some(
				(ext) => ext.name === 'dragHandle'
			)
		).toBe(true);
		expect(() => editor.destroy()).not.toThrow();
	});
});

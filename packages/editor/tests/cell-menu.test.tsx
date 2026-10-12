import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	BubbleMenu,
	cellMenuShouldShow,
	createCellMenuExtension,
	defaultCellActions,
	type BubbleAction
} from '../src/ui/index.js';

const editors: Editor[] = [];

const createTableEditor = (rows = 3, cols = 3) => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content: '<p>Before</p>'
	});
	editors.push(editor);
	editor.commands.insertTable({ rows, cols, withHeaderRow: true });
	return editor;
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

const table = (editor: Editor) =>
	editor.state.doc.content.content.find((n) => n.type.name === 'table');

const shape = (editor: Editor) => {
	const found = table(editor);
	return {
		rows: found?.childCount ?? 0,
		cols: found?.firstChild?.childCount ?? 0
	};
};

/** Positions of every cell in the table, in document order. */
const cellPositions = (editor: Editor) => {
	const positions: number[] = [];
	editor.state.doc.descendants((node, pos) => {
		if (
			node.type.name === 'tableCell' ||
			node.type.name === 'tableHeader'
		) {
			positions.push(pos);
		}
		return true;
	});
	return positions;
};

/** Selects a run of cells, which is what the cell menu exists for. */
const selectCells = (editor: Editor, fromIndex: number, toIndex: number) => {
	const positions = cellPositions(editor);
	const { doc, tr } = editor.state;
	const selection = CellSelection.create(
		doc,
		positions[fromIndex]!,
		positions[toIndex]!
	);
	editor.view.dispatch(tr.setSelection(selection));
};

const shouldShowArgs = (editor: Editor) => ({
	editor,
	element: document.createElement('div'),
	view: editor.view,
	state: editor.state,
	from: editor.state.selection.from,
	to: editor.state.selection.to
});

describe('Cell menu (CH-08)', () => {
	it('registers as its own extension, separate from the text bubble menu', () => {
		const extension = createCellMenuExtension();
		expect(extension.name).toBe('cellMenu');
	});

	it('shows for a cell selection', () => {
		const editor = createTableEditor();
		selectCells(editor, 0, 1);

		expect(editor.state.selection).toBeInstanceOf(CellSelection);
		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(true);
	});

	it('stays hidden for a caret inside a single cell', () => {
		const editor = createTableEditor();
		editor.commands.setTextSelection(cellPositions(editor)[0]! + 1);

		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(false);
	});

	it('stays hidden outside a table', () => {
		const editor = createTableEditor();
		editor.commands.setTextSelection(1);

		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(false);
	});

	it('stays hidden when the editor is read-only', () => {
		const editor = createTableEditor();
		selectCells(editor, 0, 1);
		editor.setEditable(false);

		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(false);
	});

	it('offers cell operations and no link editor', () => {
		expect(defaultCellActions.map((a) => a.id)).toEqual([
			'merge-cells',
			'split-cell',
			'toggle-header-cell',
			'add-row-after',
			'add-column-after',
			'delete-row',
			'delete-table'
		]);
	});

	it('merges a multi-cell selection', () => {
		const editor = createTableEditor();
		selectCells(editor, 3, 4);

		const merge = defaultCellActions.find((a) => a.id === 'merge-cells')!;
		expect(merge.isAvailable?.(editor)).toBe(true);

		merge.run(editor);
		expect(table(editor)?.child(1).childCount).toBe(2);
	});

	it('splits a merged cell back apart', () => {
		const editor = createTableEditor();
		selectCells(editor, 3, 4);
		defaultCellActions.find((a) => a.id === 'merge-cells')!.run(editor);
		expect(table(editor)?.child(1).childCount).toBe(2);

		const split = defaultCellActions.find((a) => a.id === 'split-cell')!;
		expect(split.isAvailable?.(editor)).toBe(true);
		split.run(editor);

		expect(table(editor)?.child(1).childCount).toBe(3);
	});

	it('deletes a row from the selection', () => {
		const editor = createTableEditor();
		selectCells(editor, 3, 4);

		defaultCellActions.find((a) => a.id === 'delete-row')!.run(editor);
		expect(shape(editor).rows).toBe(2);
	});

	it('renders the toolbar with only the available operations', () => {
		const editor = createTableEditor();
		selectCells(editor, 3, 4);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultCellActions}
				link={false}
			/>
		);

		expect(screen.getByRole('toolbar')).toBeDefined();
		expect(
			screen.getByRole('button', { name: 'Merge cells' })
		).toBeDefined();
		// Nothing is merged yet, so there is nothing to split.
		expect(screen.queryByRole('button', { name: 'Split cell' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Add link' })).toBeNull();
	});

	it('runs an operation from the toolbar', () => {
		const editor = createTableEditor();
		selectCells(editor, 3, 4);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultCellActions}
				link={false}
			/>
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Insert row below' })
		);
		expect(shape(editor).rows).toBe(4);
	});

	it('resolves custom cell actions', () => {
		const custom: BubbleAction = {
			id: 'custom',
			title: 'Custom',
			isActive: () => false,
			run: vi.fn()
		};
		const extension = createCellMenuExtension({ actions: [custom] });
		expect(extension.options.actions).toEqual([custom]);
	});
});

describe('The two bubble menus do not overlap', () => {
	it('the text bubble menu stands down for a cell selection', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>Before</p>'
		});
		editors.push(editor);
		editor.commands.insertTable({
			rows: 3,
			cols: 3,
			withHeaderRow: true
		});

		// A plain text selection: the text menu owns it.
		editor.commands.setTextSelection({ from: 1, to: 7 });
		expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(false);

		// A cell selection: the cell menu owns it.
		selectCells(editor, 0, 1);
		expect(cellMenuShouldShow(shouldShowArgs(editor))).toBe(true);
	});

	it('both extensions mount together without clashing plugin keys', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createCellMenuExtension()
			],
			content: '<p>Hello</p>'
		});

		const names = editor.extensionManager.extensions.map((e) => e.name);
		expect(names).toContain('cellMenu');
		expect(() => editor.destroy()).not.toThrow();
	});
});

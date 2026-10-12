import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	TableControls,
	TableMenu,
	actionsForAxis,
	createTableControlsExtension,
	defaultTableActions,
	resolveTableActions,
	type TableAction
} from '../src/ui/index.js';

const editors: Editor[] = [];

/** An editor with the cursor parked inside a 3 × 3 table. */
const createTableEditor = (rows = 3, cols = 3) => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content: '<p></p>'
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

/** Puts the cursor in a body cell of the second row. */
const focusBodyCell = (editor: Editor) => {
	let pos = -1;
	editor.state.doc.descendants((node, nodePos) => {
		if (pos === -1 && node.type.name === 'tableCell') {
			pos = nodePos + 1;
		}
		return pos === -1;
	});
	editor.commands.setTextSelection(pos);
	return pos;
};

describe('Table actions (CH-07)', () => {
	it('ships row, column and whole-table operations', () => {
		expect(defaultTableActions.map((a) => a.id)).toEqual([
			'add-row-before',
			'add-row-after',
			'add-column-before',
			'add-column-after',
			'toggle-header-row',
			'toggle-header-column',
			'merge-cells',
			'split-cell',
			'delete-row',
			'delete-column',
			'delete-table'
		]);
	});

	it('splits actions by axis, with both-axis entries in each', () => {
		const rowIds = actionsForAxis(defaultTableActions, 'row').map(
			(a) => a.id
		);
		const columnIds = actionsForAxis(defaultTableActions, 'column').map(
			(a) => a.id
		);

		expect(rowIds).toContain('add-row-before');
		expect(rowIds).not.toContain('add-column-before');
		expect(columnIds).toContain('add-column-after');
		expect(columnIds).not.toContain('add-row-after');

		// `both` entries appear in each list.
		for (const id of ['merge-cells', 'split-cell', 'delete-table']) {
			expect(rowIds).toContain(id);
			expect(columnIds).toContain(id);
		}
	});

	it('adds and deletes rows through the EC-14 commands', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		expect(shape(editor).rows).toBe(3);

		defaultTableActions.find((a) => a.id === 'add-row-after')!.run(editor);
		expect(shape(editor).rows).toBe(4);

		defaultTableActions.find((a) => a.id === 'add-row-before')!.run(editor);
		expect(shape(editor).rows).toBe(5);

		defaultTableActions.find((a) => a.id === 'delete-row')!.run(editor);
		expect(shape(editor).rows).toBe(4);
	});

	it('adds and deletes columns through the EC-14 commands', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		expect(shape(editor).cols).toBe(3);

		defaultTableActions
			.find((a) => a.id === 'add-column-after')!
			.run(editor);
		expect(shape(editor).cols).toBe(4);

		defaultTableActions
			.find((a) => a.id === 'add-column-before')!
			.run(editor);
		expect(shape(editor).cols).toBe(5);

		defaultTableActions.find((a) => a.id === 'delete-column')!.run(editor);
		expect(shape(editor).cols).toBe(4);
	});

	it('toggles the header row', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		expect(table(editor)?.firstChild?.firstChild?.type.name).toBe(
			'tableHeader'
		);

		defaultTableActions
			.find((a) => a.id === 'toggle-header-row')!
			.run(editor);
		expect(table(editor)?.firstChild?.firstChild?.type.name).toBe(
			'tableCell'
		);
	});

	it('deletes the whole table', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);

		defaultTableActions.find((a) => a.id === 'delete-table')!.run(editor);
		expect(table(editor)).toBeUndefined();
	});

	it('reports merge as unavailable for a single-cell selection', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);

		const merge = defaultTableActions.find((a) => a.id === 'merge-cells')!;
		expect(merge.isAvailable?.(editor)).toBe(false);
	});

	it('reports every action unavailable outside a table', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>Not a table</p>'
		});
		editors.push(editor);

		for (const action of defaultTableActions) {
			expect(action.isAvailable?.(editor)).toBe(false);
		}
	});

	it('resolves custom actions from an array or a function', () => {
		const custom: TableAction = {
			id: 'custom',
			title: 'Custom',
			axis: 'both',
			run: vi.fn()
		};

		expect(resolveTableActions([custom])).toEqual([custom]);
		expect(resolveTableActions()).toBe(defaultTableActions);
		expect(
			resolveTableActions((defaults) => [...defaults, custom]).at(-1)
		).toBe(custom);
	});
});

describe('Table menu', () => {
	it('labels itself by axis and lists only that axis', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);

		render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="row"
				onClose={vi.fn()}
			/>
		);

		expect(screen.getByRole('menu', { name: 'Row actions' })).toBeDefined();
		expect(
			screen.getByRole('menuitem', { name: 'Insert row above' })
		).toBeDefined();
		expect(
			screen.queryByRole('menuitem', { name: 'Insert column left' })
		).toBeNull();
	});

	it('hides an entry whose command cannot run', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);

		render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="row"
				onClose={vi.fn()}
			/>
		);

		// A single cell cannot be merged.
		expect(
			screen.queryByRole('menuitem', { name: 'Merge cells' })
		).toBeNull();
	});

	it('runs an entry on click and closes', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		const onClose = vi.fn();

		render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="row"
				onClose={onClose}
			/>
		);

		fireEvent.click(
			screen.getByRole('menuitem', { name: 'Insert row below' })
		);
		expect(shape(editor).rows).toBe(4);
		expect(onClose).toHaveBeenCalled();
	});

	it('navigates with arrows and runs on Enter', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		const onClose = vi.fn();

		render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="column"
				onClose={onClose}
			/>
		);

		const menu = screen.getByRole('menu');
		fireEvent.keyDown(menu, { key: 'ArrowDown' });
		fireEvent.keyDown(menu, { key: 'Enter' });

		expect(shape(editor).cols).toBe(4);
		expect(onClose).toHaveBeenCalled();
	});

	it('Escape closes without running anything', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		const onClose = vi.fn();

		render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="row"
				onClose={onClose}
			/>
		);

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
		expect(onClose).toHaveBeenCalled();
		expect(shape(editor).rows).toBe(3);
	});
});

describe('Table controls surface', () => {
	const placement = {
		columnLeft: 10,
		columnWidth: 80,
		rowTop: 20,
		rowHeight: 30,
		tableTop: 5,
		tableLeft: 2
	};

	it('renders nothing when the selection is not in a table', () => {
		const editor = createTableEditor();
		const { container } = render(
			<TableControls
				editor={editor}
				actions={defaultTableActions}
				placement={null}
			/>
		);

		expect(container.firstChild).toBeNull();
	});

	it('renders a row handle and a column handle', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);

		render(
			<TableControls
				editor={editor}
				actions={defaultTableActions}
				placement={placement}
			/>
		);

		expect(
			screen.getByRole('button', { name: 'Row actions' })
		).toBeDefined();
		expect(
			screen.getByRole('button', { name: 'Column actions' })
		).toBeDefined();
	});

	it('a handle opens its menu and locks the controls in place', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		const onLockChange = vi.fn();

		render(
			<TableControls
				editor={editor}
				actions={defaultTableActions}
				placement={placement}
				onLockChange={onLockChange}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Column actions' }));

		expect(
			screen.getByRole('menu', { name: 'Column actions' })
		).toBeDefined();
		expect(onLockChange).toHaveBeenCalledWith(true);
		expect(
			screen
				.getByRole('button', { name: 'Column actions' })
				.getAttribute('aria-expanded')
		).toBe('true');
	});

	it('clicking the handle again closes and unlocks', () => {
		const editor = createTableEditor();
		focusBodyCell(editor);
		const onLockChange = vi.fn();

		render(
			<TableControls
				editor={editor}
				actions={defaultTableActions}
				placement={placement}
				onLockChange={onLockChange}
			/>
		);

		const handle = screen.getByRole('button', { name: 'Row actions' });
		fireEvent.click(handle);
		fireEvent.click(handle);

		expect(screen.queryByRole('menu')).toBeNull();
		expect(onLockChange).toHaveBeenLastCalledWith(false);
	});
});

describe('Table controls extension wiring', () => {
	it('registers under the tableControls name', () => {
		expect(createTableControlsExtension().name).toBe('tableControls');
	});

	it('mounts and tears down inside a real editor', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createTableControlsExtension()
			],
			content: '<p>Hello</p>'
		});

		expect(
			editor.extensionManager.extensions.some(
				(ext) => ext.name === 'tableControls'
			)
		).toBe(true);
		expect(() => editor.destroy()).not.toThrow();
	});
});

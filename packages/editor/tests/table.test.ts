import { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';

describe('TableKit integration (EC-12)', () => {
	it('integrates TableKit with table nodes in standard preset', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		expect(editor.schema.nodes.table).toBeDefined();
		expect(editor.schema.nodes.tableRow).toBeDefined();
		expect(editor.schema.nodes.tableHeader).toBeDefined();
		expect(editor.schema.nodes.tableCell).toBeDefined();

		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');

		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(2);

		editor.destroy();
	});
});

describe('insertTable command and keyboard path (EC-13)', () => {
	it('inserts table via insertTable command', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const success = editor.commands.insertTable({
			rows: 3,
			cols: 3,
			withHeaderRow: true
		});
		expect(success).toBe(true);

		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});

	it('inserts table via Mod-Alt-t shortcut', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const event = new KeyboardEvent('keydown', {
			key: 't',
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			altKey: true
		});

		let handled = false;
		editor.view.someProp('handleKeyDown', (f) => {
			if (f(editor.view, event)) {
				handled = true;
				return true;
			}
			return false;
		});

		expect(handled).toBe(true);
		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});

	it('inserts table via ||| input rule', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const text = '||| ';
		for (const char of text) {
			const { from, to } = editor.state.selection;
			let handled = false;
			editor.view.someProp('handleTextInput', (f) => {
				if (
					f(editor.view, from, to, char, () =>
						editor.state.tr.insertText(char, from, to)
					)
				) {
					handled = true;
					return true;
				}
				return false;
			});
			if (!handled) {
				editor.view.dispatch(
					editor.state.tr.insertText(char, from, to)
				);
			}
		}

		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});
});

describe('table structure commands (EC-14)', () => {
	it('supports addRowBefore, addRowAfter, and deleteRow', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
		let table = editor.getJSON().content?.find((n) => n.type === 'table');
		expect(table?.content).toHaveLength(3);

		editor.commands.addRowBefore();
		table = editor.getJSON().content?.find((n) => n.type === 'table');
		expect(table?.content).toHaveLength(4);

		editor.commands.addRowAfter();
		table = editor.getJSON().content?.find((n) => n.type === 'table');
		expect(table?.content).toHaveLength(5);

		editor.commands.deleteRow();
		table = editor.getJSON().content?.find((n) => n.type === 'table');
		expect(table?.content).toHaveLength(4);

		editor.destroy();
	});

	it('supports addColumnBefore, addColumnAfter, and deleteColumn', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
		const getFirstRowCols = () => {
			const tbl = editor
				.getJSON()
				.content?.find((n) => n.type === 'table');
			const row = tbl?.content?.[0];
			return row && 'content' in row && Array.isArray(row.content)
				? row.content.length
				: 0;
		};

		expect(getFirstRowCols()).toBe(3);

		editor.commands.addColumnBefore();
		expect(getFirstRowCols()).toBe(4);

		editor.commands.addColumnAfter();
		expect(getFirstRowCols()).toBe(5);

		editor.commands.deleteColumn();
		expect(getFirstRowCols()).toBe(4);

		editor.destroy();
	});

	it('supports toggleHeaderRow and deleteTable', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
		const getFirstCellType = () => {
			const tbl = editor
				.getJSON()
				.content?.find((n) => n.type === 'table');
			const row = tbl?.content?.[0];
			if (row && 'content' in row && Array.isArray(row.content)) {
				return row.content[0]?.type;
			}
			return undefined;
		};

		expect(getFirstCellType()).toBe('tableHeader');

		editor.commands.toggleHeaderRow();
		expect(getFirstCellType()).toBe('tableCell');

		editor.commands.toggleHeaderRow();
		expect(getFirstCellType()).toBe('tableHeader');

		editor.commands.deleteTable();
		const hasTable = editor
			.getJSON()
			.content?.some((n) => n.type === 'table');
		expect(hasTable).toBe(false);

		editor.destroy();
	});
});

describe('cell merge and split (EC-15)', () => {
	it('supports merging and splitting table cells', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

		const cellPositions: number[] = [];
		editor.state.doc.descendants((node, pos) => {
			if (
				node.type.name === 'tableCell' ||
				node.type.name === 'tableHeader'
			) {
				cellPositions.push(pos);
			}
		});

		expect(cellPositions.length).toBe(9);

		// Select first two cells in the first row
		const sel = CellSelection.create(
			editor.state.doc,
			cellPositions[0]!,
			cellPositions[1]!
		);
		editor.view.dispatch(editor.state.tr.setSelection(sel));

		// Merge cells
		const merged = editor.commands.mergeCells();
		expect(merged).toBe(true);

		// After merge, first row should have 2 cells instead of 3, and first cell should have colspan 2
		let firstRowCells: number = 0;
		let firstCellColspan: number | undefined;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'tableRow' && firstRowCells === 0) {
				firstRowCells = node.childCount;
				firstCellColspan = (
					node.firstChild?.attrs as { colspan?: number }
				)?.colspan;
			}
		});

		expect(firstRowCells).toBe(2);
		expect(firstCellColspan).toBe(2);

		// Split cell back
		const split = editor.commands.splitCell();
		expect(split).toBe(true);

		firstRowCells = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'tableRow' && firstRowCells === 0) {
				firstRowCells = node.childCount;
			}
		});
		expect(firstRowCells).toBe(3);

		editor.destroy();
	});

	it('supports mergeOrSplit command', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

		const cellPositions: number[] = [];
		editor.state.doc.descendants((node, pos) => {
			if (
				node.type.name === 'tableCell' ||
				node.type.name === 'tableHeader'
			) {
				cellPositions.push(pos);
			}
		});

		// Select first two cells
		const sel = CellSelection.create(
			editor.state.doc,
			cellPositions[0]!,
			cellPositions[1]!
		);
		editor.view.dispatch(editor.state.tr.setSelection(sel));

		// mergeOrSplit merges them
		expect(editor.commands.mergeOrSplit()).toBe(true);

		let firstRowCells = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'tableRow' && firstRowCells === 0) {
				firstRowCells = node.childCount;
			}
		});
		expect(firstRowCells).toBe(2);

		// mergeOrSplit splits it
		expect(editor.commands.mergeOrSplit()).toBe(true);

		firstRowCells = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'tableRow' && firstRowCells === 0) {
				firstRowCells = node.childCount;
			}
		});
		expect(firstRowCells).toBe(3);

		editor.destroy();
	});
});

describe('table cell navigation and keymap coordination (EC-16)', () => {
	it('navigates through cells with Tab and Shift-Tab and appends row on Tab in last cell', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

		const pressKey = (
			key: string,
			modifiers: {
				shiftKey?: boolean;
			} = {}
		) => {
			const event = new KeyboardEvent('keydown', {
				key,
				bubbles: true,
				cancelable: true,
				...modifiers
			});
			let handled = false;
			editor.view.someProp('handleKeyDown', (f) => {
				if (f(editor.view, event)) {
					handled = true;
					return true;
				}
				return false;
			});
			return handled;
		};

		const initialPos = editor.state.selection.from;

		// Tab moves to next cell
		const handledTab1 = pressKey('Tab');
		expect(handledTab1).toBe(true);
		expect(editor.state.selection.from).toBeGreaterThan(initialPos);
		const posCell1 = editor.state.selection.from;

		// Shift-Tab moves back to previous cell
		const handledShiftTab = pressKey('Tab', { shiftKey: true });
		expect(handledShiftTab).toBe(true);
		expect(editor.state.selection.from).toBeLessThan(posCell1);

		// Navigate to last cell of 2x2 table
		pressKey('Tab'); // cell 1
		pressKey('Tab'); // cell 2
		pressKey('Tab'); // cell 3 (last cell)

		let rowCount = editor.getJSON().content?.find((n) => n.type === 'table')
			?.content?.length;
		expect(rowCount).toBe(2);

		// Pressing Tab in the last cell appends a new row
		pressKey('Tab');
		rowCount = editor.getJSON().content?.find((n) => n.type === 'table')
			?.content?.length;
		expect(rowCount).toBe(3);

		editor.destroy();
	});

	it('preserves Tab and Shift-Tab list indentation outside of tables', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>'
		});

		// Put cursor at end of list (on Item 2)
		editor.commands.focus('end');

		const pressKey = (
			key: string,
			modifiers: {
				shiftKey?: boolean;
			} = {}
		) => {
			const event = new KeyboardEvent('keydown', {
				key,
				bubbles: true,
				cancelable: true,
				...modifiers
			});
			let handled = false;
			editor.view.someProp('handleKeyDown', (f) => {
				if (f(editor.view, event)) {
					handled = true;
					return true;
				}
				return false;
			});
			return handled;
		};

		// Tab sinks the list item
		const handledTab = pressKey('Tab');
		expect(handledTab).toBe(true);

		const json = editor.getJSON();
		const list = json.content?.[0];
		expect(list?.type).toBe('bulletList');
		const firstItem = list?.content?.[0];
		const hasNestedList =
			firstItem &&
			'content' in firstItem &&
			Array.isArray(firstItem.content)
				? firstItem.content.some(
						(n: { type?: string }) => n.type === 'bulletList'
					)
				: false;
		expect(hasNestedList).toBe(true);

		// Shift-Tab lifts the list item
		const handledShiftTab = pressKey('Tab', { shiftKey: true });
		expect(handledShiftTab).toBe(true);

		editor.destroy();
	});

	it('supports arrow key and cell navigation commands', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

		const pos0 = editor.state.selection.from;
		expect(editor.commands.goToNextCell()).toBe(true);
		expect(editor.state.selection.from).toBeGreaterThan(pos0);

		const pos1 = editor.state.selection.from;
		expect(editor.commands.goToPreviousCell()).toBe(true);
		expect(editor.state.selection.from).toBeLessThan(pos1);

		editor.destroy();
	});
});

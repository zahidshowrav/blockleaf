import { act, fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	GridPicker,
	MAX_TABLE_COLS,
	MAX_TABLE_ROWS,
	SlashMenu,
	defaultSlashCommands,
	type SlashMenuRef
} from '../src/ui/index.js';

const editors: Editor[] = [];
const createEditor = (content = '<p>/</p>') => {
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

/** The `/` the user typed, which the picker replaces when it runs. */
const slashRange = { from: 1, to: 2 };

const tableOf = (editor: Editor) =>
	editor.state.doc.content.content.find((n) => n.type.name === 'table');

/**
 * The suggestion plugin calls `onKeyDown` from outside React's event system,
 * so the state it sets has to be flushed with `act` before the DOM reflects
 * it — exactly as it would be flushed by the next browser frame.
 */
const press = (ref: React.RefObject<SlashMenuRef | null>, key: string) => {
	let handled = false;
	act(() => {
		handled =
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key })
			} as never) ?? false;
	});
	return handled;
};

describe('Table grid picker (CH-06)', () => {
	it('renders the full grid of selectable sizes', () => {
		const editor = createEditor();
		render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		expect(screen.getAllByRole('button')).toHaveLength(
			MAX_TABLE_ROWS * MAX_TABLE_COLS
		);
		expect(screen.getByLabelText('Table size')).toBeDefined();
	});

	it('starts at 3 × 3', () => {
		const editor = createEditor();
		const { container } = render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		expect(
			container.querySelectorAll('[data-selected="true"]')
		).toHaveLength(9);
	});

	it('hovering a cell previews that size', () => {
		const editor = createEditor();
		const { container } = render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		fireEvent.mouseEnter(screen.getByLabelText('2 by 5'));
		expect(
			container.querySelectorAll('[data-selected="true"]')
		).toHaveLength(10);
	});

	it('clicking a cell inserts a table of that size and removes the slash', () => {
		const editor = createEditor();
		render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByLabelText('2 by 4'));

		const table = tableOf(editor);
		expect(table).toBeDefined();
		expect(table?.childCount).toBe(2);
		expect(table?.firstChild?.childCount).toBe(4);
		expect(editor.state.doc.textContent).not.toContain('/');
	});

	it('the first row is a header row', () => {
		const editor = createEditor();
		render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByLabelText('2 by 2'));
		expect(tableOf(editor)?.firstChild?.firstChild?.type.name).toBe(
			'tableHeader'
		);
	});

	it('arrow keys move the size and Enter inserts it', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		render(
			<GridPicker
				ref={ref}
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		press(ref, 'ArrowDown');
		press(ref, 'ArrowRight');
		press(ref, 'Enter');

		const table = tableOf(editor);
		expect(table?.childCount).toBe(4);
		expect(table?.firstChild?.childCount).toBe(4);
	});

	it('clamps at one row and one column', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		const { container } = render(
			<GridPicker
				ref={ref}
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		for (let i = 0; i < 6; i += 1) {
			press(ref, 'ArrowUp');
			press(ref, 'ArrowLeft');
		}

		expect(
			container.querySelectorAll('[data-selected="true"]')
		).toHaveLength(1);
	});

	it('clamps at the maximum size', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		const { container } = render(
			<GridPicker
				ref={ref}
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		for (let i = 0; i < 20; i += 1) {
			press(ref, 'ArrowDown');
			press(ref, 'ArrowRight');
		}

		expect(
			container.querySelectorAll('[data-selected="true"]')
		).toHaveLength(MAX_TABLE_ROWS * MAX_TABLE_COLS);
	});

	it('Escape cancels back to the list without inserting', () => {
		const editor = createEditor();
		const onCancel = vi.fn();
		const ref = createRef<SlashMenuRef>();
		render(
			<GridPicker
				ref={ref}
				editor={editor}
				range={slashRange}
				onCancel={onCancel}
			/>
		);

		press(ref, 'Escape');
		expect(onCancel).toHaveBeenCalled();
		expect(tableOf(editor)).toBeUndefined();
	});

	it('announces the current size', () => {
		const editor = createEditor();
		render(
			<GridPicker
				editor={editor}
				range={slashRange}
				onCancel={vi.fn()}
			/>
		);

		expect(screen.getByText('Insert a 3 by 3 table')).toBeDefined();
	});
});

describe('Slash menu picker routing', () => {
	it('the Table command carries a picker and still has a keyboard-only run', () => {
		const table = defaultSlashCommands.find((c) => c.id === 'table');
		expect(table?.picker).toBeDefined();
		expect(typeof table?.run).toBe('function');
	});

	it('choosing Table opens the picker instead of running', () => {
		const editor = createEditor();
		const command = vi.fn();
		render(
			<SlashMenu
				items={defaultSlashCommands}
				command={command}
				editor={editor}
				range={slashRange}
				query=""
			/>
		);

		fireEvent.click(screen.getByText('Table'));

		expect(command).not.toHaveBeenCalled();
		expect(screen.getByLabelText('Table size')).toBeDefined();
	});

	it('the picker owns the keyboard while it is open', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		render(
			<SlashMenu
				ref={ref}
				items={defaultSlashCommands}
				command={vi.fn()}
				editor={editor}
				range={slashRange}
				query=""
			/>
		);

		fireEvent.click(screen.getByText('Table'));
		press(ref, 'ArrowRight');
		press(ref, 'Enter');

		expect(tableOf(editor)?.firstChild?.childCount).toBe(4);
	});

	it('Escape in the picker returns to the list', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		render(
			<SlashMenu
				ref={ref}
				items={defaultSlashCommands}
				command={vi.fn()}
				editor={editor}
				range={slashRange}
				query=""
			/>
		);

		fireEvent.click(screen.getByText('Table'));
		expect(screen.getByLabelText('Table size')).toBeDefined();

		press(ref, 'Escape');
		expect(screen.queryByLabelText('Table size')).toBeNull();
		expect(screen.getByRole('listbox')).toBeDefined();
	});
});

import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { TableAccessibility } from '../src/core/index.js';
import { resolveLabels } from '../src/core/labels.js';
import { cellPositionAt } from '../src/core/table-a11y.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

const mount = (content: string, extensions = createExtensions('standard')) => {
	const container = document.createElement('div');
	container.className = 'blockleaf-editor';
	document.body.append(container);
	containers.push(container);

	const editor = new Editor({ element: container, extensions, content });
	editors.push(editor);
	return { editor, container };
};

/** Puts the caret inside the nth cell of the document, counted in order. */
const caretInCell = (editor: Editor, index: number) => {
	const positions: number[] = [];
	editor.state.doc.descendants((node, pos) => {
		if (
			node.type.name === 'tableCell' ||
			node.type.name === 'tableHeader'
		) {
			positions.push(pos + 2);
		}
		return true;
	});

	const target = positions[index];
	if (target === undefined) throw new Error(`no cell ${index}`);

	editor.view.dispatch(
		editor.state.tr.setSelection(
			TextSelection.create(editor.state.doc, target)
		)
	);
};

const HEADER_ROW_TABLE = `
<table>
	<tr><th>Name</th><th>Role</th></tr>
	<tr><td>Ada</td><td>Engineer</td></tr>
</table>`;

describe('header cells carry scope (HD-07)', () => {
	// The renderer has always done this. Until now the editor did not, so the
	// same document announced one way while it was edited and another once it
	// had been published.
	it('marks a header in an all-header row as heading its column', () => {
		const { container } = mount(HEADER_ROW_TABLE);

		expect(
			[...container.querySelectorAll('th')].map((th) =>
				th.getAttribute('scope')
			)
		).toEqual(['col', 'col']);
	});

	it('marks a header among data cells as heading its row', () => {
		const { container } = mount(`
<table>
	<tr><th>Name</th><th>Role</th></tr>
	<tr><th>Ada</th><td>Engineer</td></tr>
</table>`);

		expect(
			[...container.querySelectorAll('th')].map((th) =>
				th.getAttribute('scope')
			)
		).toEqual(['col', 'col', 'row']);
	});
});

describe('an empty header cell is still announced (HD-07)', () => {
	// A header nobody has typed in yet announces as nothing at all, which
	// tells a reader neither that it is a header nor that it is empty. The
	// editor cannot invent the text, so it names the cell instead.
	it('names a header that has no text', () => {
		const { container } = mount(
			'<table><tr><th></th><th>Role</th></tr><tr><td>Ada</td><td>Engineer</td></tr></table>'
		);
		const headers = [...container.querySelectorAll('th')];

		expect(headers[0]?.getAttribute('aria-label')).toBe('Empty header');
	});

	// Once there is text, a name here would talk over it.
	it('leaves a header with text unnamed', () => {
		const { container } = mount(HEADER_ROW_TABLE);

		for (const th of container.querySelectorAll('th')) {
			expect(th.hasAttribute('aria-label')).toBe(false);
		}
	});
});

describe('the scrollable box around a table (HD-08)', () => {
	// prosemirror-tables owns the wrapper, so there is no `renderHTML` to put
	// this in. A scroll container nobody can focus is one nobody without a
	// pointer can scroll.
	it('is focusable and named', () => {
		const { container } = mount(HEADER_ROW_TABLE);
		const wrapper = container.querySelector('.tableWrapper');

		expect(wrapper?.getAttribute('tabindex')).toBe('0');
		expect(wrapper?.getAttribute('role')).toBe('region');
		expect(wrapper?.getAttribute('aria-label')).toBe('Table, scrollable');
	});

	it('takes its name from the label set', () => {
		const { container } = mount(HEADER_ROW_TABLE, [
			...createExtensions('standard').filter(
				(extension) => extension.name !== 'blockleafTableAccessibility'
			),
			TableAccessibility.configure({
				labels: resolveLabels({
					table: { scrollRegion: 'Tableau, défilant' }
				})
			})
		]);

		expect(
			container.querySelector('.tableWrapper')?.getAttribute('aria-label')
		).toBe('Tableau, défilant');
	});
});

describe('where the caret is in a table (HD-07)', () => {
	it('counts from one, and says how many there are', () => {
		const { editor } = mount(HEADER_ROW_TABLE);

		caretInCell(editor, 0);
		expect(cellPositionAt(editor.state)).toEqual({
			row: 1,
			column: 1,
			rows: 2,
			columns: 2
		});

		caretInCell(editor, 3);
		expect(cellPositionAt(editor.state)).toEqual({
			row: 2,
			column: 2,
			rows: 2,
			columns: 2
		});
	});

	// Counted through TableMap rather than by counting children: a merged
	// cell occupies two columns, and telling a reader "column 2" when the
	// cell spans 2 and 3 is telling them something false.
	it('reports the first column a merged cell occupies', () => {
		const { editor } = mount(`
<table>
	<tr><th>A</th><th>B</th><th>C</th></tr>
	<tr><td>one</td><td colspan="2">two and three</td></tr>
</table>`);

		caretInCell(editor, 4);
		expect(cellPositionAt(editor.state)).toMatchObject({
			row: 2,
			column: 2,
			columns: 3
		});
	});

	it('is null when the caret is not in a table', () => {
		const { editor } = mount('<p>Outside</p>');

		expect(cellPositionAt(editor.state)).toBeNull();
	});

	it('announces the position into a live region', () => {
		const { editor, container } = mount(HEADER_ROW_TABLE);

		caretInCell(editor, 2);

		const live = container.querySelector('.blockleaf-table-live');
		expect(live?.getAttribute('aria-live')).toBe('polite');
		expect(live?.textContent).toBe('Row 2 of 2, column 1 of 2');
	});
});

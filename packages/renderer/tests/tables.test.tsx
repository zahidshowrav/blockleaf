import { describe, expect, it } from 'vitest';

import { docOf, paragraph } from './fixtures.js';
import { canonical, editorHTML, reactHTML, stringHTML } from './html.js';
import { type RenderableNode } from '../src/types.js';

/**
 * Tables are the one node the renderer writes differently from the editor, so
 * they carry their own tests rather than a parity case.
 *
 * prosemirror-tables has no concept of a table section: the editor puts every
 * row in `<tbody>`, header cells included. That is tolerable in a surface the
 * user is looking at and not tolerable in output, where `<thead>` is most of
 * what an email client, an RSS reader or a screen reader has to go on.
 */

const cell = (
	value: string,
	attrs?: Record<string, unknown>
): RenderableNode => ({
	type: 'tableCell',
	...(attrs ? { attrs } : {}),
	content: [paragraph(value)]
});

const header = (
	value: string,
	attrs?: Record<string, unknown>
): RenderableNode => ({
	type: 'tableHeader',
	...(attrs ? { attrs } : {}),
	content: [paragraph(value)]
});

const row = (...content: RenderableNode[]): RenderableNode => ({
	type: 'tableRow',
	content
});

const table = (...rows: RenderableNode[]) =>
	docOf({ type: 'table', attrs: { id: 't' }, content: rows });

const both = (doc: ReturnType<typeof table>) => [
	canonical(reactHTML(doc)),
	canonical(stringHTML(doc))
];

describe('structure', () => {
	it('puts a leading all-header row in thead and the rest in tbody', () => {
		const doc = table(
			row(header('Name'), header('Role')),
			row(cell('Ada'), cell('Engineer'))
		);

		for (const html of both(doc)) {
			expect(html).toContain('<thead>');
			expect(html).toContain('<tbody>');
			expect(html.indexOf('<thead>')).toBeLessThan(
				html.indexOf('<tbody>')
			);
			expect(html).toMatch(/<thead><tr><th[^>]*>.*?Name/);
		}
	});

	it('puts several leading header rows in thead', () => {
		const doc = table(
			row(header('A'), header('B')),
			row(header('C'), header('D')),
			row(cell('1'), cell('2'))
		);

		for (const html of both(doc)) {
			expect(html.match(/<thead>.*?<\/thead>/s)?.[0]).toContain('C');
		}
	});

	/**
	 * A mixed row is a header *column*, which prosemirror-tables also allows.
	 * Calling it a header row would claim it labels everything below it.
	 */
	it('does not treat a mixed row as a header row', () => {
		const doc = table(
			row(header('Name'), cell('Ada')),
			row(header('Role'), cell('Engineer'))
		);

		for (const html of both(doc)) {
			expect(html).not.toContain('<thead>');
			expect(html).toContain('<tbody>');
		}
	});

	it('omits thead entirely when no row is a header row', () => {
		const doc = table(row(cell('a')), row(cell('b')));

		for (const html of both(doc)) {
			expect(html).not.toContain('<thead>');
		}
	});

	it('omits tbody when every row is a header row', () => {
		const doc = table(row(header('a')), row(header('b')));

		for (const html of both(doc)) {
			expect(html).toContain('<thead>');
			expect(html).not.toContain('<tbody>');
		}
	});

	it('renders an empty table without crashing', () => {
		for (const html of both(table())) {
			expect(html).toBe('<table data-id="t"></table>');
		}
	});
});

describe('scope', () => {
	it('marks a header row as heading columns', () => {
		const doc = table(row(header('Name')), row(cell('Ada')));

		for (const html of both(doc)) {
			expect(html).toContain('scope="col"');
		}
	});

	it('marks a header cell in a body row as heading that row', () => {
		const doc = table(
			row(header('Name'), cell('Ada')),
			row(header('Role'), cell('Engineer'))
		);

		for (const html of both(doc)) {
			expect(html).toContain('scope="row"');
			expect(html).not.toContain('scope="col"');
		}
	});
});

describe('spans and widths', () => {
	it('writes colspan and rowspan only when they are greater than one', () => {
		const doc = table(
			row(
				cell('wide', { colspan: 2, rowspan: 1 }),
				cell('tall', { rowspan: 2 })
			)
		);

		for (const html of both(doc)) {
			expect(html).toContain('colspan="2"');
			expect(html).toContain('rowspan="2"');
			expect(html).not.toContain('colspan="1"');
			expect(html).not.toContain('rowspan="1"');
		}
	});

	it('moves stored column widths into colgroup', () => {
		const doc = table(
			row(
				header('A', { colwidth: [120] }),
				header('B', { colwidth: null })
			)
		);

		for (const html of both(doc)) {
			expect(html).toContain('<colgroup>');
			expect(html).toContain('width: 120px');
			expect(html).toContain('min-width: 25px');
		}
	});

	it('never writes colwidth as an attribute, which the editor does', () => {
		const doc = table(row(header('A', { colwidth: [120] })));

		for (const html of both(doc)) {
			expect(html).not.toContain('colwidth=');
		}

		expect(editorHTML(doc)).toContain('colwidth=');
	});

	it('reads a spanning cell as the columns it covers', () => {
		const doc = table(
			row(header('wide', { colspan: 2, colwidth: [80, 90] }))
		);

		for (const html of both(doc)) {
			expect(html).toContain('width: 80px');
			expect(html).toContain('width: 90px');
		}
	});

	it('sets the table min-width from the column widths, as the editor does', () => {
		const doc = table(
			row(
				header('A', { colwidth: [120] }),
				header('B', { colwidth: null })
			)
		);

		for (const html of both(doc)) {
			expect(html).toContain('min-width: 145px');
		}

		expect(editorHTML(doc)).toContain('min-width: 145px');
	});
});

describe('the two targets agree', () => {
	it('writes identical markup for a table with everything in it', () => {
		const doc = table(
			row(header('Name', { colwidth: [150] }), header('Role')),
			row(cell('Ada'), cell('Engineer')),
			row(cell('spans', { colspan: 2 }))
		);

		expect(canonical(reactHTML(doc))).toBe(canonical(stringHTML(doc)));
	});

	it('keeps the same cell content as the editor', () => {
		const doc = table(
			row(header('Name'), header('Role')),
			row(cell('Ada'), cell('Engineer'))
		);

		const words = (html: string) =>
			html
				.replace(/<[^>]+>/g, ' ')
				.split(/\s+/)
				.filter(Boolean);

		expect(words(reactHTML(doc))).toEqual(words(editorHTML(doc)));
	});
});

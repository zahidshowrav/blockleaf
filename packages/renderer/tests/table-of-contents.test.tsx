import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { canonical, editorHTML, reactHTML, stringHTML } from './html.js';
import { tableOfContents } from '../src/index.js';
import { type RenderableNode } from '../src/types.js';

/**
 * PA-08. The stored block holds nothing but its id (F27); both targets fill
 * the list in from the document's headings. The editor cannot — a node's
 * `renderHTML` sees only itself — so its `getHTML` writes the `nav` alone,
 * and that is the one difference from it, asserted here.
 */

const heading = (
	level: 1 | 2 | 3,
	value: string,
	id?: string
): RenderableNode => ({
	type: 'heading',
	attrs: { level, ...(id ? { id } : {}) },
	content: value ? [text(value)] : []
});

const toc: RenderableNode = { type: 'tableOfContents', attrs: { id: 't' } };

const outline = docOf(
	toc,
	heading(2, 'Setup', 'a'),
	paragraph('body'),
	heading(3, 'Install', 'b'),
	heading(2, '', 'empty'),
	heading(2, 'Usage', 'c')
);

const both = (doc = outline) => {
	const html = stringHTML(doc);
	expect(canonical(reactHTML(doc))).toBe(canonical(html));
	return html;
};

describe('table of contents (PA-08)', () => {
	it('lists the headings as links, indented from the highest level used', () => {
		expect(both()).toContain(
			'<nav data-id="t" data-type="tableOfContents" class="blockleaf-toc" aria-label="Table of contents"><ul>' +
				'<li data-depth="1"><a href="#a">Setup</a></li>' +
				'<li data-depth="2"><a href="#b">Install</a></li>' +
				'<li data-depth="1"><a href="#c">Usage</a></li>' +
				'</ul></nav>'
		);
	});

	it('gives headings an id to link to, in a document with a table of contents', () => {
		expect(both()).toContain('<h2 id="a" data-id="a">Setup</h2>');
	});

	it('leaves headings as they were in a document without one', () => {
		const html = both(docOf(heading(2, 'Setup', 'a')));

		expect(html).toBe('<h2 data-id="a">Setup</h2>');
		expect(canonical(html)).toBe(
			canonical(editorHTML(docOf(heading(2, 'Setup', 'a'))))
		);
	});

	it('differs from the editor only by the list it fills in', () => {
		const editor = editorHTML(outline);
		const rendered = stringHTML(outline).replace(/<ul>.*<\/ul>/, '');

		expect(
			canonical(rendered.replace(/ id="[^"]*"(?= data-id)/g, ''))
		).toBe(canonical(editor));
	});

	it('writes the nav alone while there are no headings', () => {
		expect(both(docOf(toc, paragraph('x')))).toContain(
			'aria-label="Table of contents"></nav>'
		);
	});

	it('shows a heading without an id as text, with no link', () => {
		expect(both(docOf(toc, heading(1, 'Loose')))).toContain(
			'<li data-depth="1">Loose</li>'
		);
	});

	it('escapes heading text', () => {
		const html = both(docOf(toc, heading(1, '<b>&</b>', 'x')));

		expect(html).toContain('<a href="#x">&lt;b&gt;&amp;&lt;/b&gt;</a>');
	});

	it('reads its accessible name from the labels', () => {
		const labels = { tableOfContents: 'Sommaire' };

		expect(stringHTML(outline, { labels })).toContain(
			'aria-label="Sommaire"'
		);
		expect(reactHTML(outline, { labels })).toContain(
			'aria-label="Sommaire"'
		);
	});

	it('exports the list for a host drawing its own', () => {
		expect(tableOfContents(outline)).toEqual([
			{ id: 'a', level: 2, depth: 1, text: 'Setup' },
			{ id: 'b', level: 3, depth: 2, text: 'Install' },
			{ id: 'c', level: 2, depth: 1, text: 'Usage' }
		]);
	});
});

import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { canonical, editorHTML, reactHTML } from './html.js';

/**
 * Behaviour the renderer owns: what it does with input the editor would never
 * produce, and the three places it deliberately writes something the editor
 * does not.
 */

describe('sanitisation', () => {
	it('renders nothing for an image whose source is unsafe', () => {
		const html = reactHTML(
			docOf(
				{
					type: 'image',
					attrs: { id: 'i', src: 'javascript:alert(1)' }
				},
				paragraph('after')
			)
		);

		expect(html).not.toContain('<img');
		expect(html).not.toContain('javascript:');
		expect(html).toContain('after');
	});

	it.each([
		['a blob URL', 'blob:https://example.com/abc'],
		['plain http', 'http://example.com/a.png'],
		['an SVG data URL', 'data:image/svg+xml;base64,PHN2Zz4='],
		['a protocol-relative URL', '//example.com/a.png']
	])('refuses %s as an image source', (_name, src) => {
		expect(
			reactHTML(docOf({ type: 'image', attrs: { id: 'i', src } }))
		).not.toContain('<img');
	});

	it('keeps the words of a link whose href is unsafe and drops the anchor', () => {
		const html = reactHTML(
			docOf({
				type: 'paragraph',
				content: [
					text('click me', [
						{ type: 'link', attrs: { href: 'javascript:alert(1)' } }
					])
				]
			})
		);

		expect(html).toContain('click me');
		expect(html).not.toContain('<a');
		expect(html).not.toContain('javascript:');
	});

	it('allows mailto, relative paths and anchors', () => {
		for (const href of ['mailto:a@b.com', '/docs', '#section', 'docs/x']) {
			const html = reactHTML(
				docOf({
					type: 'paragraph',
					content: [text('x', [{ type: 'link', attrs: { href } }])]
				})
			);
			expect(html).toContain(`href="${href}"`);
		}
	});

	it('honours a stored null target rather than defaulting it back', () => {
		const html = reactHTML(
			docOf({
				type: 'paragraph',
				content: [
					text('x', [
						{
							type: 'link',
							attrs: {
								href: 'https://example.com',
								target: null,
								rel: null
							}
						}
					])
				]
			})
		);

		expect(html).toContain('href="https://example.com"');
		expect(html).not.toContain('target=');
		expect(html).not.toContain('rel=');
	});
});

describe('documents this package did not write', () => {
	it('renders an unknown node as its children rather than throwing', () => {
		const html = reactHTML(
			docOf({
				type: 'somethingFromALaterVersion',
				attrs: { id: 'x' },
				content: [paragraph('the text survives')]
			})
		);

		expect(html).toBe('<p>the text survives</p>');
	});

	it('renders an unknown mark as undecorated text', () => {
		const html = reactHTML(
			docOf({
				type: 'paragraph',
				content: [text('plain', [{ type: 'sparkle' }])]
			})
		);

		expect(html).toBe('<p>plain</p>');
	});

	it.each([
		[undefined, 'h1'],
		[1, 'h1'],
		[2, 'h2'],
		[3, 'h3'],
		[9, 'h3'],
		['2', 'h1']
	])('clamps heading level %s to <%s>', (level, tag) => {
		const html = reactHTML(
			docOf({
				type: 'heading',
				attrs: level === undefined ? {} : { level },
				content: [text('H')]
			})
		);

		expect(html).toBe(`<${tag}>H</${tag}>`);
	});

	it('renders a document with no content at all', () => {
		expect(reactHTML({ type: 'doc', attrs: { schemaVersion: 1 } })).toBe(
			''
		);
	});
});

describe('deliberate differences from the editor', () => {
	/**
	 * Rendered output is a record of what the document says and nothing here
	 * can write a change back, so the checkbox says so.
	 */
	it('disables the task checkbox, which the editor leaves live', () => {
		const doc = docOf({
			type: 'taskList',
			attrs: { id: 't' },
			content: [
				{
					type: 'taskItem',
					attrs: { checked: true, id: 'i' },
					content: [paragraph('done')]
				}
			]
		});

		expect(reactHTML(doc)).toContain('disabled');
		expect(editorHTML(doc)).not.toContain('disabled');
	});

	it('still matches the editor everywhere else in a task item', () => {
		const doc = docOf({
			type: 'taskList',
			attrs: { id: 't' },
			content: [
				{
					type: 'taskItem',
					attrs: { checked: false, id: 'i' },
					content: [paragraph('todo')]
				}
			]
		});

		const normalise = (html: string) =>
			canonical(html).replace(' disabled=""', '');

		expect(normalise(reactHTML(doc))).toBe(normalise(editorHTML(doc)));
	});

	/**
	 * `details` is in the schema and the validator but has no editor
	 * extension, so only a host building documents by hand produces one.
	 */
	it('renders a details node the editor cannot produce', () => {
		const html = reactHTML(
			docOf({
				type: 'details',
				attrs: { id: 'd', open: true },
				content: [paragraph('inside')]
			})
		);

		expect(html).toContain('<details');
		expect(html).toContain('open');
		expect(html).toContain('inside');
	});
});

describe('attributes', () => {
	it('omits start on an ordered list that starts at 1', () => {
		const html = reactHTML(
			docOf({
				type: 'orderedList',
				attrs: { start: 1 },
				content: [{ type: 'listItem', content: [paragraph('one')] }]
			})
		);

		expect(html).not.toContain('start=');
	});

	it('gives an image with no alt an empty alt rather than none', () => {
		const html = reactHTML(
			docOf({
				type: 'image',
				attrs: { id: 'i', src: 'https://example.com/a.png' }
			})
		);

		expect(html).toContain('alt=""');
	});

	it('omits data-id for a block that has no id', () => {
		expect(reactHTML(docOf(paragraph('x')))).toBe('<p>x</p>');
	});

	it('nests marks outwards from the first, as the editor does', () => {
		const doc = docOf({
			type: 'paragraph',
			content: [
				text('x', [
					{ type: 'link', attrs: { href: 'https://example.com' } },
					{ type: 'code' }
				])
			]
		});

		expect(reactHTML(doc)).toContain('<a href="https://example.com"');
		expect(canonical(reactHTML(doc))).toBe(canonical(editorHTML(doc)));
	});
});

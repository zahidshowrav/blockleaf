import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { renderToHTML } from '../src/html.js';

/**
 * The string target writes markup by hand, so escaping is its own
 * responsibility rather than React's. Everything that reaches an attribute or
 * a text node here came out of someone's database.
 */

describe('escaping text', () => {
	it('escapes markup in text content', () => {
		const html = renderToHTML(
			docOf(paragraph('<script>alert(1)</script>'))
		);

		expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
		expect(html).not.toContain('<script');
	});

	it('escapes an ampersand before anything else, so entities are not doubled', () => {
		expect(renderToHTML(docOf(paragraph('a &amp; b')))).toBe(
			'<p>a &amp;amp; b</p>'
		);
	});

	it('escapes code block content', () => {
		const html = renderToHTML(
			docOf({
				type: 'codeBlock',
				content: [text('if (a < b) return "<b>";')]
			})
		);

		expect(html).toContain('a &lt; b');
		expect(html).not.toContain('<b>');
	});
});

describe('escaping attributes', () => {
	it('escapes a quote that would otherwise close the attribute', () => {
		const html = renderToHTML(
			docOf({
				type: 'image',
				attrs: {
					src: 'https://example.com/a.png',
					alt: '" onerror="alert(1)'
				}
			})
		);

		expect(html).toContain('&quot; onerror=&quot;alert(1)');
		expect(html).not.toContain('onerror="alert(1)"');
	});

	it('escapes a block id that tries to add an attribute', () => {
		const html = renderToHTML(
			docOf({
				type: 'paragraph',
				attrs: { id: '" onmouseover="alert(1)' },
				content: [text('x')]
			})
		);

		expect(html).not.toContain('onmouseover="alert(1)"');
		expect(html).toContain('&quot;');
	});

	it('escapes a callout emoji and tone', () => {
		const html = renderToHTML(
			docOf({
				type: 'callout',
				attrs: {
					emoji: '"><img src=x onerror=alert(1)>',
					tone: 'info'
				},
				content: [paragraph('x')]
			})
		);

		expect(html).not.toContain('<img');
	});

	it('escapes a highlight colour rather than letting it close the style', () => {
		const html = renderToHTML(
			docOf({
				type: 'paragraph',
				content: [
					text('x', [
						{
							type: 'highlight',
							attrs: { color: '"><script>alert(1)</script>' }
						}
					])
				]
			})
		);

		expect(html).not.toContain('<script');
	});
});

describe('attribute presence', () => {
	it('keeps an empty alt and drops an absent width', () => {
		const html = renderToHTML(
			docOf({
				type: 'image',
				attrs: { src: 'https://example.com/a.png' }
			})
		);

		expect(html).toContain('alt=""');
		expect(html).not.toContain('width=');
	});

	it('writes checked only when the task is checked', () => {
		const task = (checked: boolean) =>
			renderToHTML(
				docOf({
					type: 'taskList',
					content: [
						{
							type: 'taskItem',
							attrs: { checked },
							content: [paragraph('x')]
						}
					]
				})
			);

		expect(task(true)).toContain(
			'<input type="checkbox" checked="checked" disabled="disabled">'
		);
		expect(task(false)).toContain(
			'<input type="checkbox" disabled="disabled">'
		);
		expect(task(false)).toContain('data-checked="false"');
	});

	it('writes details open as a bare attribute', () => {
		expect(
			renderToHTML(
				docOf({
					type: 'details',
					attrs: { open: true },
					content: [paragraph('x')]
				})
			)
		).toContain('<details open>');
	});
});

describe('safety', () => {
	it('drops an image whose source is unsafe', () => {
		expect(
			renderToHTML(
				docOf({ type: 'image', attrs: { src: 'javascript:alert(1)' } })
			)
		).toBe('');
	});

	it('keeps the text of a link whose href is unsafe', () => {
		expect(
			renderToHTML(
				docOf({
					type: 'paragraph',
					content: [
						text('click', [
							{
								type: 'link',
								attrs: { href: 'javascript:alert(1)' }
							}
						])
					]
				})
			)
		).toBe('<p>click</p>');
	});
});

describe('overrides', () => {
	it('replaces one node renderer', () => {
		const html = renderToHTML(docOf(paragraph('x')), {
			components: {
				paragraph: ({ children }) => `<div>${children}</div>`
			}
		});

		expect(html).toBe('<div>x</div>');
	});

	it('replaces one mark renderer', () => {
		const html = renderToHTML(
			docOf({
				type: 'paragraph',
				content: [text('x', [{ type: 'bold' }])]
			}),
			{ marks: { bold: ({ children }) => `<b>${children}</b>` } }
		);

		expect(html).toBe('<p><b>x</b></p>');
	});
});

describe('documents this package did not write', () => {
	it('renders an unknown node as its children', () => {
		expect(
			renderToHTML(
				docOf({ type: 'fromTheFuture', content: [paragraph('kept')] })
			)
		).toBe('<p>kept</p>');
	});

	it('renders an empty document as an empty string', () => {
		expect(renderToHTML({ type: 'doc' })).toBe('');
	});
});

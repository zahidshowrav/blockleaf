import { describe, expect, it } from 'vitest';

import { docOf } from './fixtures.js';
import { canonical, editorHTML, reactHTML, stringHTML } from './html.js';
import { type RenderableDocument } from '../src/types.js';

const captionedImage = (caption: Record<string, unknown> = {}) =>
	docOf({
		type: 'figure',
		attrs: { id: 'f' },
		content: [
			{
				type: 'image',
				attrs: {
					id: 'i',
					src: 'https://cdn.test/a.png',
					alt: 'A cat',
					align: 'center'
				}
			},
			{
				type: 'caption',
				...caption,
				content: [{ type: 'text', text: 'Photo: Ada' }]
			}
		]
	});

const both = (doc: RenderableDocument) => [
	canonical(reactHTML(doc)),
	canonical(stringHTML(doc))
];

describe('a captioned image (PA-20)', () => {
	it('writes a figure: the image, then a figcaption', () => {
		for (const html of both(captionedImage())) {
			expect(html).toMatch(
				/^<figure class="blockleaf-figure" data-id="f"><img [^>]*alt="A cat"[^>]*><\/img><figcaption class="blockleaf-caption">Photo: Ada<\/figcaption><\/figure>$/
			);
		}
	});

	it('carries the caption’s own alignment as the editor does', () => {
		const doc = captionedImage({ attrs: { textAlign: 'right' } });
		const editor = canonical(editorHTML(doc));
		expect(editor).toMatch(
			/<figcaption [^>]*style="text-align: right;?"[^>]*>Photo: Ada<\/figcaption>/
		);
		for (const html of both(doc)) {
			expect(html).toMatch(
				/<figcaption [^>]*style="text-align: right;?"[^>]*>Photo: Ada<\/figcaption>/
			);
		}
	});

	it('drops an alignment that is not one of the four', () => {
		const doc = captionedImage({
			attrs: { textAlign: 'right; color: red' }
		});
		for (const html of both(doc)) {
			expect(html).not.toContain('style=');
		}
	});

	it('renders the caption with nothing above it when the image src is unsafe', () => {
		const doc = docOf({
			type: 'figure',
			content: [
				{
					type: 'image',
					attrs: { id: 'i', src: 'javascript:alert(1)' }
				},
				{ type: 'caption', content: [{ type: 'text', text: 'Bad' }] }
			]
		});
		for (const html of both(doc)) {
			expect(html).not.toContain('<img');
			expect(html).not.toContain('javascript:');
		}
	});
});

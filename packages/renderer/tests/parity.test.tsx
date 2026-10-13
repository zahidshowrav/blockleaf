import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { canonical, editorHTML, reactHTML } from './html.js';
import { type RenderableDocument } from '../src/types.js';

/**
 * The renderer and the editor must write the same HTML for the same document,
 * or the one stylesheet they share stops fitting both. Nothing enforces that
 * except this file: the two implementations have no code in common and no
 * reason to move together.
 *
 * Where they differ on purpose, the difference is asserted in
 * `render-document.test.tsx` and explained there, not hidden behind a
 * normaliser here.
 */

const cases: Array<[string, RenderableDocument]> = [
	['paragraph', docOf(paragraph('hi', 'p1'))],
	[
		'heading',
		docOf({
			type: 'heading',
			attrs: { level: 2, id: 'h' },
			content: [text('H')]
		})
	],
	[
		'blockquote',
		docOf({
			type: 'blockquote',
			attrs: { id: 'b' },
			content: [paragraph('q')]
		})
	],
	[
		'code block',
		docOf({
			type: 'codeBlock',
			attrs: { language: 'ts', id: 'c' },
			content: [text('const a = 1')]
		})
	],
	[
		'code block without a language',
		docOf({ type: 'codeBlock', attrs: { id: 'c' }, content: [text('x')] })
	],
	[
		'horizontal rule',
		docOf(
			{ type: 'horizontalRule', attrs: { id: 'r' } },
			paragraph('after')
		)
	],
	[
		'bullet list',
		docOf({
			type: 'bulletList',
			attrs: { id: 'u' },
			content: [
				{
					type: 'listItem',
					attrs: { id: 'l' },
					content: [paragraph('b')]
				}
			]
		})
	],
	[
		'ordered list with a start',
		docOf({
			type: 'orderedList',
			attrs: { start: 3, id: 'o' },
			content: [
				{
					type: 'listItem',
					attrs: { id: 'l' },
					content: [paragraph('o')]
				}
			]
		})
	],
	[
		'callout',
		docOf({
			type: 'callout',
			attrs: { emoji: '💡', tone: 'warn', id: 'k' },
			content: [paragraph('c')]
		})
	],
	[
		'image',
		docOf(
			{
				type: 'image',
				attrs: {
					id: 'm',
					src: 'https://example.com/a.png',
					alt: 'a cat',
					width: 300,
					align: 'center'
				}
			},
			paragraph('after')
		)
	],
	[
		'every mark',
		docOf({
			type: 'paragraph',
			attrs: { id: 'p' },
			content: [
				text('a', [{ type: 'bold' }]),
				text('b', [{ type: 'italic' }]),
				text('c', [{ type: 'strike' }]),
				text('d', [{ type: 'underline' }]),
				text('e', [{ type: 'code' }]),
				text('f', [
					{ type: 'link', attrs: { href: 'https://example.com' } }
				]),
				{ type: 'hardBreak' }
			]
		})
	],
	[
		'stacked marks',
		docOf({
			type: 'paragraph',
			attrs: { id: 'p' },
			content: [text('both', [{ type: 'bold' }, { type: 'italic' }])]
		})
	]
];

describe('parity with the editor', () => {
	for (const [name, doc] of cases) {
		it(`writes the same HTML as the editor for a ${name}`, () => {
			expect(canonical(reactHTML(doc))).toBe(canonical(editorHTML(doc)));
		});
	}
});

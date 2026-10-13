import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { extractHeadings, toPlainText } from '../src/index.js';

describe('toPlainText', () => {
	it('joins blocks with a blank line', () => {
		expect(toPlainText(docOf(paragraph('one'), paragraph('two')))).toBe(
			'one\n\ntwo'
		);
	});

	it('takes a separator, for a search index that wants one line', () => {
		expect(
			toPlainText(docOf(paragraph('one'), paragraph('two')), {
				blockSeparator: ' '
			})
		).toBe('one two');
	});

	it('keeps each list item separate rather than running them together', () => {
		const doc = docOf({
			type: 'bulletList',
			content: [
				{ type: 'listItem', content: [paragraph('one')] },
				{ type: 'listItem', content: [paragraph('two')] }
			]
		});

		expect(toPlainText(doc)).toBe('one\n\ntwo');
	});

	it('includes code, because a search for a function name should find it', () => {
		const doc = docOf(paragraph('before'), {
			type: 'codeBlock',
			content: [text('createEditor()')]
		});

		expect(toPlainText(doc)).toContain('createEditor()');
	});

	it('turns a hard break into a newline', () => {
		const doc = docOf({
			type: 'paragraph',
			content: [text('a'), { type: 'hardBreak' }, text('b')]
		});

		expect(toPlainText(doc)).toBe('a\nb');
	});

	it('leaves image alt text out by default and includes it on request', () => {
		const doc = docOf(
			paragraph('before'),
			{
				type: 'image',
				attrs: { src: 'https://example.com/a.png', alt: 'a cat' }
			},
			paragraph('after')
		);

		expect(toPlainText(doc)).toBe('before\n\nafter');
		expect(toPlainText(doc, { includeImageAlt: true })).toBe(
			'before\n\na cat\n\nafter'
		);
	});

	it('ignores marks', () => {
		const doc = docOf({
			type: 'paragraph',
			content: [text('bold', [{ type: 'bold' }])]
		});

		expect(toPlainText(doc)).toBe('bold');
	});

	it('returns an empty string for an empty document', () => {
		expect(toPlainText({ type: 'doc' })).toBe('');
		expect(toPlainText(docOf({ type: 'paragraph' }))).toBe('');
	});

	it('reads text out of table cells', () => {
		const doc = docOf({
			type: 'table',
			content: [
				{
					type: 'tableRow',
					content: [
						{
							type: 'tableHeader',
							content: [paragraph('Name')]
						},
						{ type: 'tableCell', content: [paragraph('Ada')] }
					]
				}
			]
		});

		expect(toPlainText(doc, { blockSeparator: ' ' })).toBe('Name Ada');
	});
});

describe('extractHeadings', () => {
	it('returns every heading in document order with its level and id', () => {
		const doc = docOf(
			{
				type: 'heading',
				attrs: { level: 1, id: 'a' },
				content: [text('Title')]
			},
			paragraph('prose'),
			{
				type: 'heading',
				attrs: { level: 3, id: 'b' },
				content: [text('Deep')]
			}
		);

		expect(extractHeadings(doc)).toEqual([
			{ level: 1, text: 'Title', id: 'a' },
			{ level: 3, text: 'Deep', id: 'b' }
		]);
	});

	it('flattens marks inside a heading', () => {
		const doc = docOf({
			type: 'heading',
			attrs: { level: 2 },
			content: [text('a '), text('word', [{ type: 'code' }])]
		});

		expect(extractHeadings(doc)[0]?.text).toBe('a word');
	});

	it('clamps a level the schema does not allow', () => {
		const doc = docOf({
			type: 'heading',
			attrs: { level: 7 },
			content: [text('x')]
		});

		expect(extractHeadings(doc)[0]?.level).toBe(3);
	});

	it('reports a missing id as undefined rather than inventing one', () => {
		const doc = docOf({
			type: 'heading',
			attrs: { level: 1 },
			content: [text('x')]
		});

		expect(extractHeadings(doc)[0]?.id).toBeUndefined();
	});

	it('finds a heading nested inside a callout', () => {
		const doc = docOf({
			type: 'callout',
			content: [
				{
					type: 'heading',
					attrs: { level: 2, id: 'n' },
					content: [text('Nested')]
				}
			]
		});

		expect(extractHeadings(doc)).toHaveLength(1);
	});

	it('returns nothing for a document with no headings', () => {
		expect(extractHeadings(docOf(paragraph('x')))).toEqual([]);
	});
});

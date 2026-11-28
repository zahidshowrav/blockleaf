import { describe, expect, it } from 'vitest';

import { createExtensions } from '@blockleaf/editor/extensions';
import { safeValidateDocument } from '@blockleaf/editor/validate';

import {
	block,
	docOf,
	editorWith,
	inline,
	paragraph,
	roundTrip,
	text
} from './helpers.js';

const sample = docOf(
	paragraph(text('Energy is '), inline('E = mc^2'), text('.')),
	block('\\int_0^1 x\\,dx', 'm1')
);

describe('the stored shape', () => {
	it('stores the LaTeX source and nothing else', () => {
		expect(roundTrip(sample)).toMatchSnapshot();
	});

	it('comes back from the editor exactly as it went in', () => {
		expect(roundTrip(sample)).toEqual(sample);
	});

	it('is kept unchanged by an editor without this package', () => {
		expect(roundTrip(sample, createExtensions('standard'))).toEqual(sample);
	});

	it('gives a new block formula a block id', () => {
		const editor = editorWith(docOf(paragraph(text('x'))));
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		editor.commands.insertMathBlock('y');
		const formula = editor
			.getJSON()
			.content?.find((node) => node.type === 'mathBlock');
		editor.destroy();
		expect(formula?.attrs?.latex).toBe('y');
		expect(typeof formula?.attrs?.id).toBe('string');
		expect(formula?.attrs?.id).not.toBe('');
	});

	it('inserts an inline formula at the selection', () => {
		const editor = editorWith(docOf(paragraph(text('ab'))));
		editor.commands.setTextSelection(2);
		editor.commands.insertMathInline('\\pi');
		const content = editor.getJSON().content?.[0]?.content;
		editor.destroy();
		expect(content).toEqual([text('a'), inline('\\pi'), text('b')]);
	});

	it('gives its source as its plain text', () => {
		const editor = editorWith(sample);
		expect(editor.getText()).toContain('E = mc^2');
		expect(editor.getText()).toContain('\\int_0^1 x\\,dx');
		editor.destroy();
	});
});

describe('validation', () => {
	it('accepts both formulas', () => {
		expect(safeValidateDocument(sample).success).toBe(true);
	});

	it('accepts an empty formula', () => {
		expect(
			safeValidateDocument(docOf(paragraph(inline('')), block('')))
				.success
		).toBe(true);
	});

	it('refuses a block formula without an id', () => {
		expect(
			safeValidateDocument(
				docOf({ type: 'mathBlock', attrs: { latex: 'x' } })
			).success
		).toBe(false);
	});

	it('refuses a source longer than 10,000 characters', () => {
		expect(
			safeValidateDocument(docOf(paragraph(inline('x'.repeat(10_001)))))
				.success
		).toBe(false);
		expect(
			safeValidateDocument(docOf(paragraph(inline('x'.repeat(10_000)))))
				.success
		).toBe(true);
	});
});

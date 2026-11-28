import { describe, expect, it } from 'vitest';

import { toPlainText } from '@blockleaf/renderer';

import {
	block,
	canonical,
	docOf,
	editorHTML,
	inline,
	paragraph,
	reactHTML,
	stringHTML,
	text
} from './helpers.js';
import { createMathComponents as htmlComponents } from '../src/html.js';
import { createMathComponents as reactComponents } from '../src/react.js';

const sample = docOf(
	paragraph(text('Energy is '), inline('E = mc^2'), text('.')),
	block('\\frac{a}{b}', 'm1')
);

describe('the renderer without this package', () => {
	it('writes the source as the editor does, from React', () => {
		expect(canonical(reactHTML(sample))).toBe(
			canonical(editorHTML(sample))
		);
	});

	it('writes the source as the editor does, as a string', () => {
		expect(canonical(stringHTML(sample))).toBe(
			canonical(editorHTML(sample))
		);
	});

	it('writes the elements the stylesheet expects', () => {
		const html = stringHTML(sample);
		expect(html).toContain(
			'<span class="blockleaf-math" data-type="mathInline">E = mc^2</span>'
		);
		expect(html).toContain(
			'<div data-id="m1" class="blockleaf-math" data-type="mathBlock">\\frac{a}{b}</div>'
		);
	});

	it('gives the source as plain text', () => {
		expect(toPlainText(sample)).toBe('Energy is E = mc^2.\n\n\\frac{a}{b}');
	});
});

describe('the renderer with this package', () => {
	const asString = stringHTML(sample, { components: htmlComponents() });
	const fromReact = reactHTML(sample, { components: reactComponents() });

	it('draws each formula, in the same element', () => {
		const host = document.createElement('div');
		host.innerHTML = asString;
		const formulas = host.querySelectorAll('.blockleaf-math');
		expect(formulas).toHaveLength(2);
		expect(formulas[0]?.querySelector('math')).not.toBeNull();
		expect(
			formulas[1]?.querySelector('math[display="block"]')
		).not.toBeNull();
		expect(formulas[1]?.getAttribute('data-id')).toBe('m1');
	});

	it('writes the same HTML from React and as a string', () => {
		expect(canonical(fromReact)).toBe(canonical(asString));
	});

	it("writes KaTeX's layout when asked for html", () => {
		expect(
			stringHTML(sample, {
				components: htmlComponents({ output: 'html' })
			})
		).toContain('katex-html');
	});

	it('keeps the source of a formula it cannot draw, marked invalid', () => {
		const bad = docOf(paragraph(inline('\\frac{a}{')));
		const expected =
			'<span class="blockleaf-math" data-type="mathInline" data-invalid="">\\frac{a}{</span>';
		expect(stringHTML(bad, { components: htmlComponents() })).toContain(
			expected
		);
		expect(
			canonical(reactHTML(bad, { components: reactComponents() }))
		).toBe(canonical(`<p data-id="p">${expected}</p>`));
	});

	it('escapes the source it keeps', () => {
		const bad = docOf(
			paragraph(inline('<img src=x onerror=alert(1)> \\frac{'))
		);
		const html = stringHTML(bad, { components: htmlComponents() });
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img');
	});
});

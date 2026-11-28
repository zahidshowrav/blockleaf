import { describe, expect, it } from 'vitest';

import { readLatex, renderLatex } from '../src/index.js';

const html = (latex: string, options?: Parameters<typeof renderLatex>[1]) => {
	const result = renderLatex(latex, options);
	if (!result.ok) throw new Error(result.error);
	return result.html;
};

describe('renderLatex', () => {
	it('writes MathML by default, with no KaTeX layout', () => {
		const out = html('x^2');
		expect(out).toContain('<math');
		expect(out).not.toContain('katex-html');
	});

	it('keeps the source in the MathML, for copying and reading back', () => {
		expect(html('\\frac{a}{b}')).toContain(
			'<annotation encoding="application/x-tex">\\frac{a}{b}</annotation>'
		);
	});

	it("writes KaTeX's own layout as well when asked for html", () => {
		const out = html('x^2', { output: 'html' });
		expect(out).toContain('katex-html');
		expect(out).toContain('<math');
	});

	it('marks a block formula as display maths', () => {
		expect(html('x', { block: true })).toContain('display="block"');
		expect(html('x')).not.toContain('display="block"');
	});

	it('never writes a link, whatever the source says', () => {
		const out = html(
			'\\href{javascript:alert(1)}{x} \\url{https://a.example}'
		);
		expect(out).not.toMatch(/<a[\s>]/);
		expect(out).not.toContain('href=');
	});

	it('does not write raw HTML commands', () => {
		const out = html('\\htmlClass{evil}{x} \\htmlStyle{color:red}{y}');
		// The source is kept in the TeX annotation; nothing acts on it.
		expect(out).not.toContain('class="evil"');
		expect(out).not.toContain('style="color:red"');
	});

	it('says why it cannot draw bad LaTeX, rather than throwing', () => {
		const result = renderLatex('\\frac{a}{');
		expect(result.ok).toBe(false);
	});

	it('uses the macros it is given', () => {
		expect(html('\\R', { macros: { '\\R': '\\mathbb{R}' } })).toContain(
			'mathvariant="double-struck"'
		);
	});

	it('does not let one formula define a macro for the next', () => {
		const macros = {};
		renderLatex('\\gdef\\foo{x}', { macros });
		expect(macros).toEqual({});
		expect(renderLatex('\\foo', { macros }).ok).toBe(false);
	});
});

describe('readLatex', () => {
	it('reads the TeX annotation from a drawn formula', () => {
		const element = document.createElement('span');
		element.innerHTML = html('\\sqrt{2}');
		expect(readLatex(element)).toBe('\\sqrt{2}');
	});

	it('reads the text of a formula that was never drawn', () => {
		const element = document.createElement('span');
		element.textContent = 'a+b';
		expect(readLatex(element)).toBe('a+b');
	});
});

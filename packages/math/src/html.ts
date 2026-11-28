/**
 * Draws formulas in `renderToHTML`'s output.
 *
 * Without this, `@blockleaf/renderer` writes each formula's LaTeX source,
 * because its size budget cannot hold KaTeX. Pass these as `components` and
 * it writes the formula instead. With the default MathML output the result
 * needs no script and no stylesheet beyond the editor's own.
 *
 * ```ts
 * import { renderToHTML } from '@blockleaf/renderer/html';
 * import { createMathComponents } from '@blockleaf/math/html';
 *
 * const html = renderToHTML(doc, { components: createMathComponents() });
 * ```
 */
import {
	element,
	escapeText,
	mathAttributes,
	type HtmlNodeRenderer
} from '@blockleaf/renderer/html';

import { renderLatex, type RenderLatexOptions } from './render-latex.js';

export type MathComponentOptions = Omit<RenderLatexOptions, 'block'>;

/**
 * The two math renderers for `renderToHTML`'s `components`. A formula that
 * cannot be drawn keeps its source, marked `data-invalid`.
 */
export const createMathComponents = (
	options: MathComponentOptions = {}
): Record<'mathInline' | 'mathBlock', HtmlNodeRenderer> => {
	const render: HtmlNodeRenderer = ({ node }) => {
		const { latex, block, attributes } = mathAttributes(node);
		const tag = block ? 'div' : 'span';
		if (latex.trim() === '') return element(tag, attributes, '');

		const result = renderLatex(latex, { ...options, block });
		return result.ok
			? element(tag, attributes, result.html)
			: element(
					tag,
					{ ...attributes, 'data-invalid': '' },
					escapeText(latex)
				);
	};
	return { mathInline: render, mathBlock: render };
};

export {
	renderLatex,
	type MathOutput,
	type RenderLatexResult
} from './render-latex.js';

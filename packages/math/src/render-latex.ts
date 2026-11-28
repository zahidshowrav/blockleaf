import katex from 'katex';

/**
 * How a formula is drawn.
 *
 * - `'mathml'`, the default: the browser draws it from MathML. No KaTeX
 *   stylesheet and no fonts, so the editor's one stylesheet is all a page
 *   needs. It looks slightly different from one browser to the next.
 * - `'html'`: KaTeX lays it out itself, the same in every browser, with
 *   MathML beside it for screen readers. The page must also load
 *   `katex/dist/katex.min.css`.
 */
export type MathOutput = 'mathml' | 'html';

export interface RenderLatexOptions {
	/** A block formula, centred on its own line, rather than one inside text. */
	block?: boolean;
	/** `'mathml'` by default. See `MathOutput`. */
	output?: MathOutput;
	/**
	 * Macros every formula can use, such as `{ '\\R': '\\mathbb{R}' }`. Read,
	 * never written: a `\gdef` in one formula does not reach the next.
	 */
	macros?: Readonly<Record<string, string>>;
}

export type RenderLatexResult =
	{ ok: true; html: string } | { ok: false; error: string };

/**
 * Draws one formula as an HTML string, or says why it cannot.
 *
 * Untrusted, always: KaTeX shows `\href`, `\url`, `\includegraphics` and
 * raw HTML commands as text instead of following them, so a formula can never
 * carry a link that skipped the editor's own link rule. Bad LaTeX never
 * throws; the caller shows the source instead.
 */
export const renderLatex = (
	latex: string,
	options: RenderLatexOptions = {}
): RenderLatexResult => {
	try {
		const html = katex.renderToString(latex, {
			displayMode: options.block === true,
			output: options.output === 'html' ? 'htmlAndMathml' : 'mathml',
			throwOnError: true,
			trust: false,
			strict: 'ignore',
			// A copy, because KaTeX writes `\gdef` definitions into the object
			// it is given.
			macros: { ...options.macros },
			// Bounds the work one formula can cause, so a stored document
			// cannot stall the page that shows it.
			maxExpand: 1000,
			maxSize: 50
		});
		return { ok: true, html };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
};

/**
 * A formula's source as stored HTML carries it: the TeX annotation KaTeX
 * writes into its MathML, where the formula was drawn, or else the
 * element's own text.
 */
export const readLatex = (element: HTMLElement): string => {
	const annotation = element.querySelector(
		'annotation[encoding="application/x-tex"]'
	);
	return (annotation ?? element).textContent ?? '';
};

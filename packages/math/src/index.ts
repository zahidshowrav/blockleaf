/**
 * Maths for the Blockleaf editor.
 *
 * A formula inside a line of text, and a formula as its own block, written
 * in LaTeX and drawn by KaTeX. Only the source is stored, so a document
 * stays small and every formula can be edited again.
 *
 * Type `$x^2$` in a line, or `$$` then Enter on an empty line, or choose
 * Math in the slash menu. Click a formula, or press Enter on a selected
 * one, to change it.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withMath } from '@blockleaf/math';
 *
 * const extensions = withMath(presets.standard());
 * ```
 *
 * The blocks are in the stored schema from version 2. An editor without
 * this package keeps a stored formula as a placeholder and saves it back
 * unchanged.
 */
import { type Extensions } from '@tiptap/core';

import {
	MATH_BLOCK_NODE,
	MATH_INLINE_NODE
} from '@blockleaf/editor/extensions';

import {
	MATH_KEYMAP_EXTENSION_NAME,
	MathBlock,
	MathInline,
	MathKeymap
} from './nodes.js';
import { type MathOutput } from './render-latex.js';

export {
	MATH_BLOCK_NODE,
	MATH_INLINE_NODE
} from '@blockleaf/editor/extensions';
export {
	MATH_KEYMAP_EXTENSION_NAME,
	MathBlock,
	MathInline,
	MathKeymap,
	type MathNodeOptions
} from './nodes.js';
export {
	readLatex,
	renderLatex,
	type MathOutput,
	type RenderLatexOptions,
	type RenderLatexResult
} from './render-latex.js';

export type MathOptions = {
	/**
	 * `'mathml'` by default: the browser draws each formula, with no
	 * stylesheet or fonts to add. `'html'` draws it with KaTeX's own
	 * layout, the same in every browser, and needs
	 * `katex/dist/katex.min.css` on the page.
	 */
	output?: MathOutput;
	/** Macros every formula can use, such as `{ '\\R': '\\mathbb{R}' }`. */
	macros?: Readonly<Record<string, string>>;
	/** `$x^2$` and `$$` then Enter make a formula; `false` leaves them out. */
	shortcuts?: false;
};

const NAMES: ReadonlySet<string> = new Set([
	MATH_INLINE_NODE,
	MATH_BLOCK_NODE,
	MATH_KEYMAP_EXTENSION_NAME
]);

/** The inline and block formulas, and the keys that make and open them. */
export const createMath = (options: MathOptions = {}): Extensions => {
	const configured = {
		...(options.output ? { output: options.output } : {}),
		...(options.macros ? { macros: options.macros } : {}),
		...(options.shortcuts === false ? { shortcuts: false } : {})
	};
	const configure = Object.keys(configured).length > 0;
	return [
		configure ? MathInline.configure(configured) : MathInline,
		configure ? MathBlock.configure(configured) : MathBlock,
		...(options.shortcuts === false ? [] : [MathKeymap])
	];
};

/**
 * Adds the formulas to an extension list, replacing any already there.
 */
export const withMath = (
	extensions: Extensions,
	options: MathOptions = {}
): Extensions => [
	...extensions.filter((extension) => !NAMES.has(extension.name)),
	...createMath(options)
];

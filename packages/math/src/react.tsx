/**
 * Draws formulas in `RenderDocument`'s output.
 *
 * Without this, `@blockleaf/renderer` shows each formula's LaTeX source,
 * because its size budget cannot hold KaTeX. Pass these as `components` and
 * it shows the formula instead. With the default MathML output it needs no
 * script in the browser, so it works in a server component.
 *
 * ```tsx
 * import { RenderDocument } from '@blockleaf/renderer/react';
 * import { createMathComponents } from '@blockleaf/math/react';
 *
 * const components = createMathComponents();
 *
 * <RenderDocument doc={doc} components={components} />;
 * ```
 */
import { mathAttributes, type NodeRenderer } from '@blockleaf/renderer/react';

import { renderLatex, type RenderLatexOptions } from './render-latex.js';

export type MathComponentOptions = Omit<RenderLatexOptions, 'block'>;

/**
 * The two math components for `RenderDocument`'s `components`. A formula
 * that cannot be drawn keeps its source, marked `data-invalid`.
 *
 * Make them once, outside the component that renders the page, so each
 * render does not build them again.
 */
export const createMathComponents = (
	options: MathComponentOptions = {}
): Record<'mathInline' | 'mathBlock', NodeRenderer> => {
	const Formula: NodeRenderer = ({ node }) => {
		const { latex, block, attributes } = mathAttributes(node);
		const { class: className, ...data } = attributes;
		const Tag = block ? 'div' : 'span';
		if (latex.trim() === '') {
			return (
				<Tag
					className={className}
					{...data}
				/>
			);
		}

		const result = renderLatex(latex, { ...options, block });
		if (!result.ok) {
			return (
				<Tag
					className={className}
					{...data}
					data-invalid=""
				>
					{latex}
				</Tag>
			);
		}
		// KaTeX's own output, untrusted mode: it contains no script and no
		// link, whatever the stored LaTeX says.
		return (
			<Tag
				className={className}
				{...data}
				dangerouslySetInnerHTML={{ __html: result.html }}
			/>
		);
	};
	return { mathInline: Formula, mathBlock: Formula };
};

export {
	renderLatex,
	type MathOutput,
	type RenderLatexResult
} from './render-latex.js';

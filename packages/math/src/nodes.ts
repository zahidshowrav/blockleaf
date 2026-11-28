import { Extension, InputRule, mergeAttributes, Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

import {
	defaultLabels,
	type MathLabels,
	type ResolvedLabels
} from '@blockleaf/editor';
import {
	MATH_BLOCK_NODE,
	MATH_INLINE_NODE
} from '@blockleaf/editor/extensions';

import { createMathView, OPEN_EVENT } from './node-view.js';
import { readLatex, type MathOutput } from './render-latex.js';

export interface MathNodeOptions {
	HTMLAttributes: Record<string, unknown>;
	/** The editor's labels. `BlockleafEditor` hands in its own. */
	labels: ResolvedLabels;
	/** `'mathml'` by default. See `MathOutput`. */
	output: MathOutput;
	/** Macros every formula can use, such as `{ '\\R': '\\mathbb{R}' }`. */
	macros: Readonly<Record<string, string>>;
	/** `$x^2$` makes a formula. `false` leaves the input rule out. */
	shortcuts: boolean;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mathInline: {
			/** Inserts a formula inside the line, at the selection. */
			insertMathInline: (latex?: string) => ReturnType;
		};
		mathBlock: {
			/** Inserts a formula as its own block, at the selection. */
			insertMathBlock: (latex?: string) => ReturnType;
		};
	}
}

const text = (value: unknown): string =>
	typeof value === 'string' ? value : '';

const mathLabels = (labels: ResolvedLabels): MathLabels =>
	labels.math ?? defaultLabels.math;

/**
 * The stored source. Not written as an attribute: the element's text is
 * the source, so a page with no maths support still shows something a
 * reader can follow.
 */
const latexAttribute = {
	latex: {
		default: '',
		rendered: false,
		parseHTML: (element: HTMLElement) => readLatex(element)
	}
};

const defaults = (): MathNodeOptions => ({
	HTMLAttributes: {},
	labels: defaultLabels,
	output: 'mathml',
	macros: {},
	shortcuts: true
});

/**
 * A formula inside a line of text, stored as `{ latex }`. An atom: the
 * caret moves past it, and it is edited as a whole, in its own field.
 */
export const MathInline = /* @__PURE__ */ Node.create<MathNodeOptions>({
	name: MATH_INLINE_NODE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addOptions: defaults,

	addAttributes: () => latexAttribute,

	parseHTML() {
		return [{ tag: `span[data-type="${MATH_INLINE_NODE}"]` }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-math',
				'data-type': MATH_INLINE_NODE
			}),
			text(node.attrs.latex)
		];
	},

	renderText({ node }) {
		return text(node.attrs.latex);
	},

	addNodeView() {
		return createMathView({
			block: false,
			labels: mathLabels(this.options.labels),
			render: { output: this.options.output, macros: this.options.macros }
		});
	},

	addCommands() {
		return {
			insertMathInline:
				(latex = '') =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { latex }
					})
		};
	},

	addInputRules() {
		if (!this.options.shortcuts) return [];
		const type = this.type;
		return [
			// `$x^2$` becomes a formula when the closing `$` is typed. Not
			// after a letter, a digit or a backslash, and not around
			// spaces, so `$5 and $10` stays a sentence about money.
			new InputRule({
				find: /(?:^|[^\\$\w])(\$([^$\s](?:[^$]*[^$\s\\])?)\$)$/,
				handler: ({ state, range, match }) => {
					const [whole, formula, latex] = match;
					if (!whole || !formula || latex === undefined) return null;
					const start = range.from + (whole.length - formula.length);
					state.tr.replaceWith(
						start,
						range.to,
						type.create({ latex })
					);
				}
			})
		];
	}
});

/**
 * A formula as its own block, stored as `{ id, latex }`. The drag handle
 * and block menu work on it as on any block.
 */
export const MathBlock = /* @__PURE__ */ Node.create<MathNodeOptions>({
	name: MATH_BLOCK_NODE,
	group: 'block',
	atom: true,
	selectable: true,
	defining: true,

	addOptions: defaults,

	addAttributes: () => latexAttribute,

	parseHTML() {
		return [{ tag: `div[data-type="${MATH_BLOCK_NODE}"]` }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-math',
				'data-type': MATH_BLOCK_NODE
			}),
			text(node.attrs.latex)
		];
	},

	renderText({ node }) {
		return text(node.attrs.latex);
	},

	addNodeView() {
		return createMathView({
			block: true,
			labels: mathLabels(this.options.labels),
			render: { output: this.options.output, macros: this.options.macros }
		});
	},

	addCommands() {
		return {
			insertMathBlock:
				(latex = '') =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { latex }
					})
		};
	}
});

/** The keyboard: Enter opens a selected formula, and `$$` then Enter makes one. */
export const MATH_KEYMAP_EXTENSION_NAME = 'mathKeymap';

export const MathKeymap = /* @__PURE__ */ Extension.create({
	name: MATH_KEYMAP_EXTENSION_NAME,

	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				const { selection, schema } = editor.state;

				if (
					selection instanceof NodeSelection &&
					(selection.node.type.name === MATH_INLINE_NODE ||
						selection.node.type.name === MATH_BLOCK_NODE)
				) {
					const dom = editor.view.nodeDOM(selection.from);
					if (!(dom instanceof HTMLElement)) return false;
					dom.dispatchEvent(new CustomEvent(OPEN_EVENT));
					return true;
				}

				// `$$` alone in a paragraph, then Enter, becomes an empty
				// block formula, which opens its field.
				const { $from, empty } = selection;
				const mathBlock = schema.nodes[MATH_BLOCK_NODE];
				if (
					!empty ||
					!mathBlock ||
					$from.parent.type.name !== 'paragraph' ||
					$from.parent.textContent !== '$$' ||
					$from.parentOffset !== 2
				) {
					return false;
				}
				const start = $from.before();
				return editor
					.chain()
					.command(({ tr }) => {
						tr.replaceWith(
							start,
							start + $from.parent.nodeSize,
							mathBlock.create({ latex: '' })
						);
						return true;
					})
					.run();
			}
		};
	}
});

import {
	Node,
	combineTransactionSteps,
	findParentNode,
	getChangedRanges,
	mergeAttributes
} from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
	NodeSelection,
	Plugin,
	PluginKey,
	TextSelection,
	type EditorState,
	type Selection,
	type Transaction
} from '@tiptap/pm/state';

import { CAPTION_NODE, CAPTIONABLE_GROUP, FIGURE_NODE } from '../constants.js';
import { readTextAlign, type TextAlignment } from '../text-align.js';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		figure: {
			/**
			 * Gives the selected block a caption, or takes its caption away.
			 * The block is the table around the caret, or a
			 * selected image or other captionable block. Adding one puts the
			 * caret in the new caption.
			 */
			toggleCaption: () => ReturnType;
			/**
			 * `toggleCaption`, for a table only: false anywhere else. Kept
			 * because tables could be captioned before anything else.
			 */
			toggleTableCaption: () => ReturnType;
			/**
			 * Aligns the caption of the figure around the selection; `null`
			 * goes back to following its block.
			 */
			setCaptionAlign: (alignment: TextAlignment | null) => ReturnType;
		};
	}
}

const isCaptionable = (node: ProseMirrorNode): boolean =>
	node.type.isInGroup(CAPTIONABLE_GROUP);

/**
 * The figure's block, if it still has one worth keeping. Deleting the block
 * inside a figure does not empty the figure: ProseMirror fills the gap with
 * a made-up one — a table holding one row and no cells, or an image with no
 * `src` or a card with no `url` — so those count as gone too.
 */
const blockOf = (figure: ProseMirrorNode): ProseMirrorNode | null => {
	const first = figure.firstChild;
	if (!first) return null;
	if (first.type.name === 'table') {
		let cells = 0;
		first.forEach((row) => {
			cells += row.childCount;
		});
		return cells > 0 ? first : null;
	}
	if (!isCaptionable(first)) return null;
	// A media block points at its file with `src`, a link card with `url`.
	const src: unknown = first.attrs.src ?? first.attrs.url;
	return typeof src === 'string' && src.length > 0 ? first : null;
};

/** The selected node, when the selection is a node selection. */
const selectedNode = (selection: Selection): ProseMirrorNode | null =>
	selection instanceof NodeSelection ? selection.node : null;

const parentFigure = (selection: Selection) =>
	findParentNode((node) => node.type.name === FIGURE_NODE)(selection);

/**
 * Removes a figure that lost its table — `deleteTable` deletes the table node
 * and nothing around it, which would leave a caption on its own.
 *
 * Only the ranges the transactions changed are looked at, and the figures
 * around them, so a keystroke in a long document does not walk all of it.
 */
const dropOrphanedFigures = (
	transactions: readonly Transaction[],
	oldState: EditorState,
	state: EditorState
): Transaction | null => {
	const transform = combineTransactionSteps(oldState.doc, [...transactions]);
	const orphans = new Map<number, number>();
	const check = (node: ProseMirrorNode, pos: number) => {
		if (node.type.name === FIGURE_NODE && !blockOf(node)) {
			orphans.set(pos, pos + node.nodeSize);
		}
	};
	for (const { newRange } of getChangedRanges(transform)) {
		const $from = state.doc.resolve(newRange.from);
		for (let depth = $from.depth; depth > 0; depth -= 1) {
			check($from.node(depth), $from.before(depth));
		}
		state.doc.nodesBetween(newRange.from, newRange.to, (node, pos) => {
			check(node, pos);
			return node.type.name !== FIGURE_NODE;
		});
	}
	if (orphans.size === 0) return null;
	const tr = state.tr;
	const ranges = [...orphans].sort(([a], [b]) => b - a);
	for (const [from, to] of ranges) tr.delete(from, to);
	return tr;
};

/**
 * The text under a captioned block. Rich text, so a credit can carry its
 * link. It only exists as the last child of a `figure`.
 *
 * Its alignment is the `textAlign` attribute every preset carries:
 * unset, it follows its block's, so a centred image has a centred caption
 * without anyone asking for one.
 */
export const Caption = /* @__PURE__ */ Node.create({
	name: CAPTION_NODE,
	// Above the core keymap, whose Enter would try to split the caption in
	// two and fail, so that Enter leaves the caption instead.
	priority: 110,
	content: 'inline*',
	marks: '_',
	// Enter, Backspace and a selection that spans it must not split it off,
	// join it into the last cell, or leave a figure without one.
	isolating: true,
	defining: true,

	parseHTML() {
		return [{ tag: 'figcaption' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'figcaption',
			mergeAttributes(HTMLAttributes, { class: 'blockleaf-caption' }),
			0
		];
	},

	addKeyboardShortcuts() {
		const inCaption = () =>
			this.editor.state.selection.$from.parent.type.name === CAPTION_NODE;

		// Enter leaves the caption for a paragraph below the figure. A caption
		// is one line of context, and a second caption has nowhere to go.
		const exit = () => {
			if (!inCaption()) return false;
			const { state } = this.editor;
			const { $from } = state.selection;
			const after = $from.after($from.depth - 1);
			const next = state.doc.resolve(after).nodeAfter;
			if (next?.type.name === 'paragraph' && next.content.size === 0) {
				return this.editor.commands.setTextSelection(after + 1);
			}
			return this.editor
				.chain()
				.insertContentAt(after, { type: 'paragraph' })
				.setTextSelection(after + 1)
				.run();
		};

		// Backspace at the start of an empty caption removes it; at the start
		// of a written one it does nothing, rather than pulling the text into
		// the last cell or deleting the image above.
		const backspace = () => {
			if (!inCaption()) return false;
			const { selection } = this.editor.state;
			if (!selection.empty || selection.$from.parentOffset > 0) {
				return false;
			}
			if (selection.$from.parent.content.size > 0) return true;
			return this.editor.commands.toggleCaption();
		};

		return {
			Enter: exit,
			'Mod-Enter': exit,
			Backspace: backspace
		};
	}
});

/**
 * Wraps a block that has a caption: the block first, its `caption` last.
 *
 * The caption is beside the block rather than inside it because
 * `prosemirror-tables` reads every child of a `table` as a row, and
 * because it leaves an image the atom it always was. The block is
 * a table, or any node in the `captionable` group.
 */
export const Figure = /* @__PURE__ */ Node.create({
	name: FIGURE_NODE,
	// Above the table kit's 100, so the orphan check below runs before
	// `prosemirror-tables` tries to repair the cell-less table a deleted one
	// leaves behind — which it does again on every pass, forever.
	priority: 110,
	group: 'block',
	content: `(table | ${CAPTIONABLE_GROUP}) ${CAPTION_NODE}`,
	isolating: true,
	defining: true,

	parseHTML() {
		return [
			{
				tag: 'figure',
				// Only a figure this schema can hold: a table or an image, and
				// a caption. Any other is left to the rules for its content,
				// so a figure with no caption keeps its block instead of
				// gaining an empty caption, and one holding something this
				// schema cannot caption is not forced into a table.
				getAttrs: (element) =>
					element.querySelector(':scope > figcaption') &&
					element.querySelector(
						':scope > table, :scope > div > table, :scope > img'
					)
						? null
						: false
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'figure',
			mergeAttributes(HTMLAttributes, { class: 'blockleaf-figure' }),
			0
		];
	},

	addCommands() {
		/**
		 * Wraps `node` at `pos` in a figure with an empty caption and puts the
		 * caret in it, or returns false if a figure cannot go there.
		 */
		const wrap = (
			state: EditorState,
			tr: Transaction,
			dispatch: unknown,
			pos: number,
			node: ProseMirrorNode
		): boolean => {
			const figureType = state.schema.nodes[FIGURE_NODE];
			const captionType = state.schema.nodes[CAPTION_NODE];
			if (!figureType || !captionType) return false;
			const $pos = state.doc.resolve(pos);
			if (
				!$pos.parent.canReplaceWith(
					$pos.index(),
					$pos.index() + 1,
					figureType
				)
			) {
				return false;
			}
			if (dispatch) {
				tr.replaceWith(
					pos,
					pos + node.nodeSize,
					figureType.create(null, [node, captionType.create()])
				);
				// Into the figure (+1), past the block, into the caption (+1).
				const caption = pos + 1 + node.nodeSize + 1;
				tr.setSelection(TextSelection.create(tr.doc, caption));
			}
			return true;
		};

		/**
		 * Replaces the figure around the selection with its block. A table
		 * gets the caret at the end of its last cell; anything else is
		 * selected, as it was before it had a caption.
		 */
		const unwrap = (
			tr: Transaction,
			dispatch: unknown,
			figure: { pos: number; node: ProseMirrorNode },
			block: ProseMirrorNode
		): boolean => {
			if (dispatch) {
				tr.replaceWith(
					figure.pos,
					figure.pos + figure.node.nodeSize,
					block
				);
				if (block.type.name === 'table') {
					const end = figure.pos + block.nodeSize - 1;
					tr.setSelection(
						TextSelection.near(tr.doc.resolve(end), -1)
					);
				} else {
					tr.setSelection(NodeSelection.create(tr.doc, figure.pos));
				}
			}
			return true;
		};

		const tableAround = (selection: Selection) =>
			findParentNode((node) => node.type.name === 'table')(selection);

		return {
			toggleCaption:
				() =>
				({ state, tr, dispatch }) => {
					const selected = selectedNode(state.selection);
					// A selected figure — the block menu selects one — counts
					// as being inside it.
					const figure =
						selected?.type.name === FIGURE_NODE
							? { pos: state.selection.from, node: selected }
							: parentFigure(state.selection);
					const block = figure ? blockOf(figure.node) : null;
					if (figure && block) {
						return unwrap(tr, dispatch, figure, block);
					}

					if (selected && isCaptionable(selected)) {
						return wrap(
							state,
							tr,
							dispatch,
							state.selection.from,
							selected
						);
					}

					const table = tableAround(state.selection);
					if (!table) return false;
					return wrap(state, tr, dispatch, table.pos, table.node);
				},

			toggleTableCaption:
				() =>
				({ state, commands }) => {
					const figure = parentFigure(state.selection);
					const inTable = figure
						? figure.node.firstChild?.type.name === 'table'
						: tableAround(state.selection) !== undefined;
					return inTable && commands.toggleCaption();
				},

			setCaptionAlign:
				(alignment) =>
				({ state, tr, dispatch }) => {
					const figure = parentFigure(state.selection);
					const caption = figure?.node.lastChild;
					if (!figure || caption?.type.name !== CAPTION_NODE) {
						return false;
					}
					const value =
						alignment === null
							? undefined
							: readTextAlign(alignment);
					if (alignment !== null && value === undefined) return false;
					if (dispatch) {
						const pos =
							figure.pos +
							figure.node.nodeSize -
							caption.nodeSize -
							1;
						tr.setNodeAttribute(pos, 'textAlign', value);
					}
					return true;
				}
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockleafFigure'),
				appendTransaction: (transactions, oldState, state) =>
					transactions.some((transaction) => transaction.docChanged)
						? dropOrphanedFigures(transactions, oldState, state)
						: null
			})
		];
	}
});

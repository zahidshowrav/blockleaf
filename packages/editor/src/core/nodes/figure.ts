import {
	Node,
	combineTransactionSteps,
	findParentNode,
	getChangedRanges,
	mergeAttributes
} from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
	Plugin,
	PluginKey,
	TextSelection,
	type EditorState,
	type Transaction
} from '@tiptap/pm/state';

import { CAPTION_NODE, FIGURE_NODE } from '../constants.js';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		figure: {
			/**
			 * Gives the table around the selection a caption, or takes its
			 * caption away. Adding one puts the caret in the new caption.
			 */
			toggleTableCaption: () => ReturnType;
		};
	}
}

/**
 * The figure's table, if it still has one worth keeping. Deleting the table
 * inside a figure does not empty the figure: ProseMirror fills the gap with
 * a made-up table holding one row and no cells, so a table without a single
 * cell counts as gone too.
 */
const tableOf = (figure: ProseMirrorNode): ProseMirrorNode | null => {
	const first = figure.firstChild;
	if (first?.type.name !== 'table') return null;
	let cells = 0;
	first.forEach((row) => {
		cells += row.childCount;
	});
	return cells > 0 ? first : null;
};

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
		if (node.type.name === FIGURE_NODE && !tableOf(node)) {
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
 * link (`F20`). It only exists as the last child of a `figure`.
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
		// the last cell.
		const backspace = () => {
			if (!inCaption()) return false;
			const { selection } = this.editor.state;
			if (!selection.empty || selection.$from.parentOffset > 0) {
				return false;
			}
			if (selection.$from.parent.content.size > 0) return true;
			return this.editor.commands.toggleTableCaption();
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
 * `prosemirror-tables` reads every child of a `table` as a row (`F20`).
 * Only tables take one for now; `PA-20` widens the content to images.
 */
export const Figure = /* @__PURE__ */ Node.create({
	name: FIGURE_NODE,
	// Above the table kit's 100, so the orphan check below runs before
	// `prosemirror-tables` tries to repair the cell-less table a deleted one
	// leaves behind — which it does again on every pass, forever.
	priority: 110,
	group: 'block',
	content: `table ${CAPTION_NODE}`,
	isolating: true,
	defining: true,

	parseHTML() {
		return [
			{
				tag: 'figure',
				// Only a figure this schema can hold. Any other is left to the
				// rules for its content, so a pasted image figure keeps its
				// image instead of being forced into a table.
				getAttrs: (element) =>
					element.querySelector(
						':scope > table, :scope > div > table'
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
		return {
			toggleTableCaption:
				() =>
				({ state, tr, dispatch }) => {
					const figure = findParentNode(
						(node) => node.type.name === FIGURE_NODE
					)(state.selection);
					const captioned = figure ? tableOf(figure.node) : null;
					if (figure && captioned) {
						if (dispatch) {
							tr.replaceWith(
								figure.pos,
								figure.pos + figure.node.nodeSize,
								captioned
							);
							// The caret goes to the end of the last cell.
							const end = figure.pos + captioned.nodeSize - 1;
							tr.setSelection(
								TextSelection.near(tr.doc.resolve(end), -1)
							);
						}
						return true;
					}

					const table = findParentNode(
						(node) => node.type.name === 'table'
					)(state.selection);
					const figureType = state.schema.nodes[FIGURE_NODE];
					const captionType = state.schema.nodes[CAPTION_NODE];
					if (!table || !figureType || !captionType) return false;
					const $table = state.doc.resolve(table.pos);
					if (
						!$table.parent.canReplaceWith(
							$table.index(),
							$table.index() + 1,
							figureType
						)
					) {
						return false;
					}
					if (dispatch) {
						tr.replaceWith(
							table.pos,
							table.pos + table.node.nodeSize,
							figureType.create(null, [
								table.node,
								captionType.create()
							])
						);
						// Into the figure (+1), past the table, into the
						// caption (+1).
						const caption = table.pos + 1 + table.node.nodeSize + 1;
						tr.setSelection(TextSelection.create(tr.doc, caption));
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

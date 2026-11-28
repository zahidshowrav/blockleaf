import { type Extensions, mergeAttributes, Node } from '@tiptap/core';
import {
	type Node as ProseMirrorNode,
	type NodeType,
	type ResolvedPos
} from '@tiptap/pm/model';
import {
	type EditorState,
	NodeSelection,
	Plugin,
	PluginKey,
	TextSelection,
	type Transaction
} from '@tiptap/pm/state';
import { type EditorView } from '@tiptap/pm/view';

import { COLUMN_NODE, COLUMNS_NODE } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';

export interface ColumnsOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		columns: {
			/** Inserts a row of empty columns, two to four, and puts the caret in the first. */
			insertColumns: (count?: number) => ReturnType;
			/** Sets every column in the row around the caret back to an equal width. */
			resetColumnWidths: () => ReturnType;
			/**
			 * Removes the column holding the caret. A row left with one column
			 * turns back into that column's blocks.
			 */
			removeColumn: () => ReturnType;
		};
	}
}

/** The most columns one row holds. */
export const MAX_COLUMNS = 4;

/** The narrowest a column can be dragged, in per cent of the row. */
const MIN_WIDTH = 10;

const COLUMNS_CLASS = 'blockleaf-columns';
const COLUMN_CLASS = 'blockleaf-column';

const isColumns = (node: ProseMirrorNode | null | undefined) =>
	node?.type.name === COLUMNS_NODE;

/** A stored width: a share between 0 and 100, or `null`. */
const widthOf = (node: ProseMirrorNode): number | null => {
	const width: unknown = node.attrs.width;
	return typeof width === 'number' && width > 0 && width <= 100
		? width
		: null;
};

const round = (value: number) => Math.round(value * 10) / 10;

/* -------------------------------------------------------------------------- */
/* Keeping rows valid                                                         */
/* -------------------------------------------------------------------------- */

/**
 * After any change: a row with one column becomes that column's blocks, a
 * row inside a column is lifted out into its blocks, and a row where only
 * some columns have a width goes back to equal widths, since a width only
 * means something next to the others.
 *
 * A drag, a cut or a paste can each leave one of these behind, and fixing
 * the result is simpler than guarding every way in.
 */
const normalise = (state: EditorState): Transaction | null => {
	const fixes: Array<(tr: Transaction) => void> = [];

	state.doc.descendants((node, pos, parent) => {
		if (!isColumns(node)) return true;

		if (parent?.type.name === COLUMN_NODE || node.childCount < 2) {
			// Every block of every column, in order, where the row was.
			const blocks: ProseMirrorNode[] = [];
			node.forEach((column) =>
				column.forEach((block) => blocks.push(block))
			);
			fixes.push((tr) =>
				tr.replaceWith(
					tr.mapping.map(pos),
					tr.mapping.map(pos + node.nodeSize),
					blocks
				)
			);
			return false;
		}

		const widths: Array<number | null> = [];
		node.forEach((column) => widths.push(widthOf(column)));
		if (widths.some((width) => width === null) && widths.some(Boolean)) {
			fixes.push((tr) => {
				let at = tr.mapping.map(pos) + 1;
				node.forEach((column) => {
					tr.setNodeAttribute(at, 'width', null);
					at += column.nodeSize;
				});
			});
		}
		return true;
	});

	if (!fixes.length) return null;
	const tr = state.tr;
	for (const fix of fixes) fix(tr);
	return tr;
};

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/** The column around a position, and the row around that. */
const columnAround = ($pos: ResolvedPos) => {
	for (let depth = $pos.depth; depth > 1; depth -= 1) {
		if ($pos.node(depth).type.name === COLUMN_NODE) {
			return {
				column: $pos.node(depth),
				columnPos: $pos.before(depth),
				row: $pos.node(depth - 1),
				rowPos: $pos.before(depth - 1)
			};
		}
	}
	return null;
};

/** Sets every column of the row at `rowPos` to `widths`, or all to `null`. */
const setWidths = (
	tr: Transaction,
	rowPos: number,
	widths: ReadonlyArray<number | null> | null
) => {
	const row = tr.doc.nodeAt(rowPos);
	if (!isColumns(row)) return;
	let at = rowPos + 1;
	row?.forEach((column, _offset, index) => {
		tr.setNodeAttribute(at, 'width', widths?.[index] ?? null);
		at += column.nodeSize;
	});
};

const emptyColumn = (state: EditorState, content?: ProseMirrorNode) => {
	const column = state.schema.nodes[COLUMN_NODE];
	const paragraph = state.schema.nodes.paragraph;
	if (!column || !paragraph) return null;
	return column.create(null, content ?? paragraph.create());
};

/* -------------------------------------------------------------------------- */
/* Dropping a block beside another                                            */
/* -------------------------------------------------------------------------- */

/** How close to a block's side edge a drop makes columns, in px. */
const EDGE = 64;

interface DropTarget {
	/** The top-level block dropped beside. */
	pos: number;
	side: 'left' | 'right';
}

/** The top-level block under the pointer, and which edge it is near. */
const dropTargetAt = (
	view: EditorView,
	event: DragEvent
): { target: DropTarget; rect: DOMRect } | null => {
	const dragging = view.dragging;
	if (!dragging?.move || typeof document.elementsFromPoint !== 'function') {
		return null;
	}
	// One block from the drag handle, and never a row of columns: a row
	// beside a row would be columns inside a column.
	const dragged = dragging.slice.content;
	if (dragged.childCount !== 1 || isColumns(dragged.firstChild)) return null;

	const block = document
		.elementsFromPoint(event.clientX, event.clientY)
		.find((element) => element.parentElement === view.dom);
	if (!(block instanceof HTMLElement)) return null;

	const rect = block.getBoundingClientRect();
	const edge = Math.min(EDGE, rect.width / 5);
	const side =
		event.clientX < rect.left + edge
			? 'left'
			: event.clientX > rect.right - edge
				? 'right'
				: null;
	if (!side) return null;

	const inside = view.posAtDOM(block, 0);
	if (inside < 0) return null;
	const $inside = view.state.doc.resolve(inside);
	if ($inside.depth === 0) return null;
	const pos = $inside.before(1);

	const node = view.state.doc.nodeAt(pos);
	const { selection } = view.state;
	// Not beside itself, and not onto a full row.
	if (selection instanceof NodeSelection && selection.from === pos) {
		return null;
	}
	if (isColumns(node) && (node?.childCount ?? 0) >= MAX_COLUMNS) return null;

	return { target: { pos, side }, rect };
};

/**
 * Moves the dragged block beside the target: a new row of two, or a new
 * column in the target's row.
 */
const dropBeside = (view: EditorView, target: DropTarget): boolean => {
	const { state } = view;
	const columnsType: NodeType | undefined = state.schema.nodes[COLUMNS_NODE];
	const dragged = view.dragging?.slice.content.firstChild;
	if (!columnsType || !dragged) return false;

	const tr = state.tr;
	if (state.selection instanceof NodeSelection) tr.deleteSelection();

	const pos = tr.mapping.map(target.pos);
	const node = tr.doc.nodeAt(pos);
	const added = emptyColumn(state, dragged);
	if (!node || !added) return false;

	if (isColumns(node)) {
		tr.insert(
			target.side === 'left' ? pos + 1 : pos + node.nodeSize - 1,
			added
		);
		setWidths(tr, pos, null);
	} else {
		const other = emptyColumn(state, node);
		if (!other) return false;
		tr.replaceWith(
			pos,
			pos + node.nodeSize,
			columnsType.create(
				null,
				target.side === 'left' ? [added, other] : [other, added]
			)
		);
	}

	view.dispatch(tr.scrollIntoView());
	return true;
};

/**
 * Shows where a drop on a block's edge will put the block, as a line down
 * that edge, and makes the drop. Anywhere else, the editor's own drop
 * applies.
 */
const createDropPlugin = () => {
	let target: DropTarget | null = null;
	let line: HTMLElement | null = null;

	const hide = () => {
		target = null;
		line?.remove();
	};

	return new Plugin({
		key: new PluginKey('blockleafColumnsDrop'),
		props: {
			handleDOMEvents: {
				dragover: (view, event) => {
					const found = dropTargetAt(view, event);
					if (!found) {
						hide();
						return false;
					}
					event.preventDefault();
					target = found.target;

					const container =
						view.dom.closest<HTMLElement>('.blockleaf-editor') ??
						view.dom.parentElement;
					if (!container) return true;
					line ??= document.createElement('div');
					line.className = 'blockleaf-columns-drop';
					const box = container.getBoundingClientRect();
					const x =
						found.target.side === 'left'
							? found.rect.left - 6
							: found.rect.right + 4;
					line.style.left = `${x - box.left}px`;
					line.style.top = `${found.rect.top - box.top}px`;
					line.style.height = `${found.rect.height}px`;
					if (!line.isConnected) container.append(line);
					// The editor's own drop line would show a second place.
					return true;
				},
				dragleave: (view, event) => {
					const to = event.relatedTarget;
					if (
						!(to instanceof globalThis.Node) ||
						!view.dom.contains(to)
					) {
						hide();
					}
					return false;
				},
				dragend: () => {
					hide();
					return false;
				}
			},
			handleDrop: (view) => {
				const current = target;
				hide();
				return current ? dropBeside(view, current) : false;
			}
		}
	});
};

/* -------------------------------------------------------------------------- */
/* Nodes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One column. Its divider, on the right edge of every column but the last,
 * drags to share the width with the next column, and a double click on it
 * sets the whole row back to equal widths.
 */
export const Column = /* @__PURE__ */ Node.create<ColumnsOptions>({
	name: COLUMN_NODE,
	content: 'block+',
	// Backspace at the start of a column does not join it to the one before.
	isolating: true,
	defining: true,
	draggable: false,

	addOptions() {
		return { HTMLAttributes: {}, labels: defaultLabels };
	},

	addAttributes() {
		return {
			width: {
				default: null,
				parseHTML: (element) => {
					const width = Number.parseFloat(
						element.getAttribute('data-width') ?? ''
					);
					return width > 0 && width <= 100 ? width : null;
				},
				renderHTML: (attributes) => {
					const width: unknown = attributes.width;
					return typeof width === 'number'
						? { 'data-width': width, style: `flex-grow: ${width}` }
						: {};
				}
			}
		};
	},

	parseHTML() {
		return [{ tag: `div[data-type="${COLUMN_NODE}"]` }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': COLUMN_NODE,
				class: COLUMN_CLASS
			}),
			0
		];
	},

	addNodeView() {
		const { labels } = this.options;
		return ({ node: initial, getPos, editor }) => {
			let node = initial;
			const document_ = globalThis.document;

			const dom = document_.createElement('div');
			dom.className = COLUMN_CLASS;
			dom.dataset.type = COLUMN_NODE;
			const content = document_.createElement('div');
			content.className = `${COLUMN_CLASS}__content`;

			// Pointer only, so out of the accessibility tree. The keyboard and
			// a screen reader edit the blocks, which is what matters; the
			// widths are presentation.
			const divider = document_.createElement('div');
			divider.className = `${COLUMN_CLASS}__resize`;
			divider.contentEditable = 'false';
			divider.title = labels.columns.resize;
			divider.setAttribute('aria-hidden', 'true');
			dom.append(content, divider);

			const sync = () => {
				const width = widthOf(node);
				dom.style.flexGrow = width === null ? '' : String(width);
				const id: unknown = node.attrs.id;
				if (typeof id === 'string') dom.dataset.id = id;
				else delete dom.dataset.id;
			};
			sync();

			const rowPos = () => {
				const pos = getPos();
				if (typeof pos !== 'number') return null;
				const $pos = editor.state.doc.resolve(pos);
				return { rowPos: $pos.before(), index: $pos.index() };
			};

			divider.addEventListener('dblclick', (event) => {
				event.preventDefault();
				const at = rowPos();
				if (!at || !editor.isEditable) return;
				const tr = editor.state.tr;
				setWidths(tr, at.rowPos, null);
				editor.view.dispatch(tr);
			});

			divider.addEventListener('pointerdown', (event) => {
				const at = rowPos();
				const row = dom.parentElement;
				if (!at || !row || !editor.isEditable || event.button !== 0)
					return;
				event.preventDefault();

				const columns = Array.from(row.children).filter(
					(child): child is HTMLElement =>
						child instanceof HTMLElement &&
						child.classList.contains(COLUMN_CLASS)
				);
				const sizes = columns.map(
					(column) => column.getBoundingClientRect().width
				);
				const total = sizes.reduce((sum, size) => sum + size, 0);
				if (!total || at.index >= columns.length - 1) return;

				const start = sizes.map((size) => (size / total) * 100);
				const shares = [...start];
				const pair = start[at.index]! + start[at.index + 1]!;
				const startX = event.clientX;

				const move = (moveEvent: PointerEvent) => {
					const delta = ((moveEvent.clientX - startX) / total) * 100;
					const left = Math.min(
						Math.max(start[at.index]! + delta, MIN_WIDTH),
						pair - MIN_WIDTH
					);
					shares[at.index] = left;
					shares[at.index + 1] = pair - left;
					columns.forEach((column, index) => {
						column.style.flexGrow = String(shares[index]);
					});
				};

				const finish = () => {
					divider.removeEventListener('pointermove', move);
					divider.removeEventListener('pointerup', finish);
					divider.removeEventListener('pointercancel', finish);
					dom.classList.remove(`${COLUMN_CLASS}--resizing`);
					const tr = editor.state.tr;
					setWidths(tr, at.rowPos, shares.map(round));
					editor.view.dispatch(tr);
				};

				divider.setPointerCapture?.(event.pointerId);
				dom.classList.add(`${COLUMN_CLASS}--resizing`);
				divider.addEventListener('pointermove', move);
				divider.addEventListener('pointerup', finish);
				divider.addEventListener('pointercancel', finish);
			});

			return {
				dom,
				contentDOM: content,
				update: (next) => {
					if (next.type !== node.type) return false;
					node = next;
					sync();
					return true;
				},
				stopEvent: (event) =>
					event.target instanceof globalThis.Node &&
					divider.contains(event.target),
				ignoreMutation: (mutation) =>
					mutation.type !== 'selection' &&
					!content.contains(mutation.target)
			};
		};
	}
});

/**
 * A row of two to four columns, side by side. Below 640px wide they stack,
 * in order.
 */
export const Columns = /* @__PURE__ */ Node.create<ColumnsOptions>({
	name: COLUMNS_NODE,
	// Above the editor's own drop handling, so a drop on a block's edge is
	// seen here first.
	priority: 1000,
	group: 'block',
	content: `${COLUMN_NODE}+`,
	isolating: true,
	defining: true,

	addOptions() {
		return { HTMLAttributes: {}, labels: defaultLabels };
	},

	parseHTML() {
		return [{ tag: `div[data-type="${COLUMNS_NODE}"]` }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': COLUMNS_NODE,
				class: COLUMNS_CLASS
			}),
			0
		];
	},

	addCommands() {
		return {
			insertColumns:
				(count = 2) =>
				({ state, tr, dispatch }) => {
					const type = state.schema.nodes[COLUMNS_NODE];
					const columns = Array.from(
						{ length: Math.min(Math.max(count, 2), MAX_COLUMNS) },
						() => emptyColumn(state)
					);
					if (!type || columns.some((column) => !column))
						return false;
					// Not inside a column: a row there would be lifted straight out.
					if (columnAround(state.selection.$from)) return false;
					if (!dispatch) return true;

					const row = type.create(null, columns as ProseMirrorNode[]);
					const { $from } = state.selection;
					const parent = $from.parent;
					// An empty paragraph, such as the one a slash command
					// leaves, is replaced rather than kept above the row.
					const replace =
						$from.depth === 1 &&
						parent.type.name === 'paragraph' &&
						parent.content.size === 0;
					const from = replace
						? $from.before(1)
						: $from.depth
							? $from.after(1)
							: $from.pos;
					const to = replace ? $from.after(1) : from;
					tr.replaceWith(from, to, row);
					tr.setSelection(TextSelection.create(tr.doc, from + 3));
					return true;
				},
			resetColumnWidths:
				() =>
				({ state, tr, dispatch }) => {
					const found = columnAround(state.selection.$from);
					if (!found) return false;
					if (dispatch) setWidths(tr, found.rowPos, null);
					return true;
				},
			removeColumn:
				() =>
				({ state, tr, dispatch }) => {
					const found = columnAround(state.selection.$from);
					if (!found) return false;
					if (!dispatch) return true;
					tr.delete(
						found.columnPos,
						found.columnPos + found.column.nodeSize
					);
					// A row left with one column is unwrapped by `normalise`.
					if (found.row.childCount > 2)
						setWidths(tr, found.rowPos, null);
					const $at = tr.doc.resolve(
						Math.min(
							tr.mapping.map(found.columnPos),
							tr.doc.content.size
						)
					);
					tr.setSelection(TextSelection.near($at, -1));
					return true;
				}
		};
	},

	addKeyboardShortcuts() {
		return {
			// At the start of an empty column, Backspace removes the column.
			Backspace: () => {
				const { selection } = this.editor.state;
				const { $from } = selection;
				if (!selection.empty || $from.parentOffset > 0) return false;
				const found = columnAround($from);
				if (
					!found ||
					found.column.childCount !== 1 ||
					found.column.textContent !== '' ||
					!found.column.firstChild?.isTextblock
				) {
					return false;
				}
				return this.editor.commands.removeColumn();
			}
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockleafColumns'),
				appendTransaction: (transactions, _old, state) =>
					transactions.some((tr) => tr.docChanged)
						? normalise(state)
						: null
			}),
			createDropPlugin()
		];
	}
});

/** The two column nodes, configured. */
export const createLayout = (
	options: Partial<ColumnsOptions> = {}
): Extensions => [Columns.configure(options), Column.configure(options)];

/**
 * Adds columns to an extension list, replacing any already there.
 *
 * ```ts
 * const extensions = withLayout(presets.standard());
 * ```
 */
export const withLayout = (
	extensions: Extensions,
	options: Partial<ColumnsOptions> = {}
): Extensions => [
	...extensions.filter(
		(extension) =>
			extension.name !== COLUMNS_NODE && extension.name !== COLUMN_NODE
	),
	...createLayout(options)
];

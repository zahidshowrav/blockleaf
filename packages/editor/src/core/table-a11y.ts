import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { TableMap } from '@tiptap/pm/tables';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

import { TABLE_A11Y_EXTENSION_NAME } from './constants.js';
import {
	defaultLabels,
	type ResolvedLabels,
	type TableLabels
} from './labels.js';

/**
 * What a table owes a screen reader, and what it owes a narrow screen.
 *
 * HD-07 and HD-08. None of this is stored: the semantics are decided from the
 * document's shape every time it is rendered, so no `SCHEMA_VERSION` moves
 * and nothing in anyone's database has to be migrated.
 */
export const TABLE_A11Y_PLUGIN_KEY = /* @__PURE__ */ new PluginKey(
	TABLE_A11Y_EXTENSION_NAME
);

/** The box prosemirror-tables puts around every table it renders. */
const WRAPPER_SELECTOR = '.tableWrapper';

export interface TableAccessibilityOptions {
	labels: ResolvedLabels;
}

/**
 * `scope` on every header cell, and a name for the ones still empty.
 *
 * prosemirror-tables builds the cell DOM itself and emits a bare `<th>`, so
 * until now the same document announced one way while it was being edited and
 * another once `@blockleaf/renderer` had published it. A header cell in a row
 * of nothing but headers heads its column; one sitting among data cells heads
 * that row. The rule is `TableHeader` in `packages/renderer`, kept in step.
 */
const headerDecorations = (
	doc: ProseMirrorNode,
	labels: TableLabels
): Decoration[] => {
	const decorations: Decoration[] = [];

	doc.descendants((node, pos) => {
		// A textblock holds text, never a table, and on a long document its
		// children are most of the nodes there are. Not descending into them
		// is the difference between walking the document and walking its
		// structure.
		if (node.isTextblock) return false;
		if (node.type.name !== 'tableRow') return true;

		let headersOnly = true;
		node.forEach((cell) => {
			if (cell.type.name !== 'tableHeader') headersOnly = false;
		});

		node.forEach((cell, offset) => {
			if (cell.type.name !== 'tableHeader') return;
			// `pos` is before the row, so its content starts one in.
			const from = pos + 1 + offset;
			decorations.push(
				Decoration.node(from, from + cell.nodeSize, {
					scope: headersOnly ? 'col' : 'row',
					// A header nobody has typed in yet is announced as nothing
					// at all, which tells a reader neither that it is a header
					// nor that it is empty. Only while it is empty: once there
					// is text, a name here would talk over it.
					...(cell.textContent.trim().length === 0
						? { 'aria-label': labels.emptyHeader }
						: {})
				})
			);
		});

		return false;
	});

	return decorations;
};

type CellPosition = {
	row: number;
	column: number;
	rows: number;
	columns: number;
};

/** The depth of the cell holding `$pos`, or `null` if it is not in one. */
const cellDepth = ($pos: ResolvedPos): number | null => {
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		const role = $pos.node(depth).type.spec.tableRole;
		if (role === 'cell' || role === 'header_cell') return depth;
	}
	return null;
};

/**
 * Where the caret is, counted the way a reader would count it.
 *
 * Through `TableMap` rather than by counting children, because a merged cell
 * occupies more than one column and a reader who is told "column 2" when the
 * cell spans 2 and 3 has been told something false.
 */
export const cellPositionAt = (state: EditorState): CellPosition | null => {
	const { $from } = state.selection;
	const depth = cellDepth($from);
	if (depth === null) return null;

	// cell → row → table.
	const tableDepth = depth - 2;
	if (tableDepth < 0) return null;

	const table = $from.node(tableDepth);
	if (table.type.spec.tableRole !== 'table') return null;

	const map = TableMap.get(table);
	const rect = map.findCell($from.before(depth) - $from.start(tableDepth));

	return {
		row: rect.top + 1,
		column: rect.left + 1,
		rows: map.height,
		columns: map.width
	};
};

class TableAccessibilityView {
	private view: EditorView;
	private labels: TableLabels;
	private live: HTMLElement;
	private announced = '';

	constructor(view: EditorView, labels: TableLabels) {
		this.view = view;
		this.labels = labels;

		this.live = document.createElement('div');
		this.live.className = 'blockleaf-table-live';
		this.live.setAttribute('role', 'status');
		this.live.setAttribute('aria-live', 'polite');

		const container =
			view.dom.closest('.blockleaf-editor') ?? view.dom.parentElement;
		container?.append(this.live);

		this.sync();
	}

	update(view: EditorView) {
		this.view = view;
		this.sync();
	}

	private sync() {
		this.markWrappers();
		this.announce();
	}

	/**
	 * Makes the box a wide table scrolls inside reachable.
	 *
	 * The wrapper belongs to prosemirror-tables' node view, so there is no
	 * `renderHTML` to add this in and a decoration cannot reach outside the
	 * table node. A scroll container that cannot take focus cannot be
	 * scrolled by anyone without a pointer, which axe reports and a keyboard
	 * user simply experiences.
	 */
	private markWrappers() {
		const wrappers =
			this.view.dom.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR);

		for (const wrapper of wrappers) {
			if (wrapper.dataset.blockleafScrollRegion === 'true') continue;
			wrapper.dataset.blockleafScrollRegion = 'true';
			wrapper.setAttribute('tabindex', '0');
			wrapper.setAttribute('role', 'region');
			wrapper.setAttribute('aria-label', this.labels.scrollRegion);
		}
	}

	/**
	 * Says where the caret has landed.
	 *
	 * A table cell is a box a screen reader describes by its contents; moving
	 * between them is silent unless something says so. The message is only
	 * written when it changes, or every keystroke inside one cell would
	 * re-announce the same position.
	 */
	private announce() {
		const position = cellPositionAt(this.view.state);
		const message = position
			? this.labels.cellPosition(
					position.row,
					position.column,
					position.rows,
					position.columns
				)
			: '';

		if (message === this.announced) return;
		this.announced = message;
		this.live.textContent = message;
	}

	destroy() {
		this.live.remove();
	}
}

export const TableAccessibility =
	/* @__PURE__ */ Extension.create<TableAccessibilityOptions>({
		name: TABLE_A11Y_EXTENSION_NAME,

		addOptions() {
			return { labels: defaultLabels };
		},

		addProseMirrorPlugins() {
			const labels = this.options.labels.table;
			let cached: { doc: ProseMirrorNode; set: DecorationSet } | null =
				null;

			return [
				new Plugin({
					key: TABLE_A11Y_PLUGIN_KEY,
					props: {
						// Cached on the document's identity. `decorations` is
						// asked on every update, and most updates move the
						// caret rather than the document — a document is
						// immutable, so the same one has the same answer.
						decorations: (state) => {
							if (cached?.doc === state.doc) return cached.set;
							const set = DecorationSet.create(
								state.doc,
								headerDecorations(state.doc, labels)
							);
							cached = { doc: state.doc, set };
							return set;
						}
					},
					view: (view) => new TableAccessibilityView(view, labels)
				})
			];
		}
	});

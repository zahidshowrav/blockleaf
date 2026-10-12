import { Plugin, PluginKey, type PluginView } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const TABLE_CONTROLS_PLUGIN_KEY = /* @__PURE__ */ new PluginKey(
	'blockleafTableControls'
);

export type TablePlacement = {
	/** Offsets within the editor container, in px. */
	columnLeft: number;
	columnWidth: number;
	rowTop: number;
	rowHeight: number;
	tableTop: number;
	tableLeft: number;
};

const CELL_TYPES = ['tableCell', 'tableHeader'];

const findTableDOM = (view: EditorView): HTMLElement | null => {
	const { $anchor } = view.state.selection;

	for (let depth = $anchor.depth; depth > 0; depth -= 1) {
		if ($anchor.node(depth).type.name === 'table') {
			const dom = view.nodeDOM($anchor.before(depth));
			if (!(dom instanceof HTMLElement)) return null;
			return dom.matches('table')
				? dom
				: (dom.querySelector('table') ?? dom);
		}
	}
	return null;
};

const findCellDOM = (view: EditorView): HTMLElement | null => {
	const { $anchor } = view.state.selection;

	for (let depth = $anchor.depth; depth > 0; depth -= 1) {
		if (CELL_TYPES.includes($anchor.node(depth).type.name)) {
			const dom = view.nodeDOM($anchor.before(depth));
			return dom instanceof HTMLElement ? dom : null;
		}
	}
	return null;
};

/**
 * Measures where the handles go, from the cell the cursor is in.
 *
 * Only the current row and column get a handle, rather than a strip of one
 * per row and per column. A strip means measuring every cell on every
 * selection change and re-measuring on every resize, and it covers the
 * table's own edges in a way that fights text selection. The cursor already
 * says which row and column the user means.
 */
export const measurePlacement = (
	view: EditorView,
	container: HTMLElement
): TablePlacement | null => {
	const table = findTableDOM(view);
	const cell = findCellDOM(view);
	if (!table || !cell) return null;
	if (typeof table.getBoundingClientRect !== 'function') return null;

	const tableRect = table.getBoundingClientRect();
	const cellRect = cell.getBoundingClientRect();
	const containerRect = container.getBoundingClientRect();

	return {
		columnLeft: cellRect.left - containerRect.left,
		columnWidth: cellRect.width,
		rowTop: cellRect.top - containerRect.top,
		rowHeight: cellRect.height,
		tableTop: tableRect.top - containerRect.top,
		tableLeft: tableRect.left - containerRect.left
	};
};

class TableControlsView implements PluginView {
	private view: EditorView;
	private element: HTMLElement;
	private onChange: (placement: TablePlacement | null) => void;
	private container: HTMLElement;
	private locked = false;
	private visible = false;

	constructor(
		view: EditorView,
		element: HTMLElement,
		onChange: (placement: TablePlacement | null) => void
	) {
		this.view = view;
		this.element = element;
		this.onChange = onChange;
		this.container =
			(view.dom.closest('.blockleaf-editor') as HTMLElement | null) ??
			(view.dom.parentElement as HTMLElement);

		this.container.appendChild(this.element);
		this.sync();
	}

	setLocked = (locked: boolean) => {
		this.locked = locked;
		if (!locked) this.sync();
	};

	private sync() {
		if (this.locked) return;

		const placement = this.view.editable
			? measurePlacement(this.view, this.container)
			: null;

		if (!placement) {
			if (this.visible) {
				this.visible = false;
				this.onChange(null);
			}
			return;
		}

		this.visible = true;
		this.onChange(placement);
	}

	update(view: EditorView) {
		this.view = view;
		this.sync();
	}

	destroy() {
		this.element.remove();
	}
}

export const createTableControlsPlugin = ({
	element,
	onChange,
	onReady
}: {
	element: HTMLElement;
	onChange: (placement: TablePlacement | null) => void;
	onReady: (setLocked: (locked: boolean) => void) => void;
}) =>
	new Plugin({
		key: TABLE_CONTROLS_PLUGIN_KEY,
		view(view) {
			const controls = new TableControlsView(view, element, onChange);
			onReady(controls.setLocked);
			return controls;
		}
	});

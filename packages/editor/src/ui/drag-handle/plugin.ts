import { Plugin, type PluginKey, type PluginView } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/** Horizontal probe into the content area, in px from its left edge. */
const PROBE_INSET = 24;

export type DragHandleController = {
	/** Keeps the handle visible while its menu is open. */
	setLocked: (locked: boolean) => void;
};

/**
 * Finds the top-level block under a viewport y coordinate.
 *
 * It probes *inside* the content area rather than at the pointer, because the
 * pointer is normally in the gutter where there is no block to hit.
 */
const findBlockDOM = (
	view: EditorView,
	clientY: number
): HTMLElement | null => {
	if (typeof document.elementsFromPoint !== 'function') {
		return null;
	}

	const rect = view.dom.getBoundingClientRect();
	const probeX = rect.left + Math.min(PROBE_INSET, rect.width / 2);

	for (const element of document.elementsFromPoint(probeX, clientY)) {
		if (element.parentElement === view.dom) {
			return element as HTMLElement;
		}
	}
	return null;
};

/** The position *before* the depth-1 block containing `dom`. */
const blockPosFor = (view: EditorView, dom: HTMLElement): number | null => {
	const pos = view.posAtDOM(dom, 0);
	if (pos < 0) return null;

	try {
		const $pos = view.state.doc.resolve(pos);
		if ($pos.depth === 0) return null;
		return $pos.before(1);
	} catch {
		// posAtDOM can hand back a position that no longer resolves when the
		// document changed under a queued mousemove.
		return null;
	}
};

class DragHandleView implements PluginView {
	private view: EditorView;
	private element: HTMLElement;
	private onChange: (pos: number | null) => void;
	private container: HTMLElement;
	private locked = false;
	private currentPos: number | null = null;

	constructor(
		view: EditorView,
		element: HTMLElement,
		onChange: (pos: number | null) => void
	) {
		this.view = view;
		this.element = element;
		this.onChange = onChange;
		this.container =
			(view.dom.closest('.blockleaf-editor') as HTMLElement | null) ??
			(view.dom.parentElement as HTMLElement);

		this.container.appendChild(this.element);
		this.container.addEventListener('mousemove', this.onMouseMove);
		this.container.addEventListener('mouseleave', this.onMouseLeave);
	}

	controller: DragHandleController = {
		setLocked: (locked: boolean) => {
			this.locked = locked;
			if (!locked) {
				this.hide();
			}
		}
	};

	private onMouseMove = (event: MouseEvent) => {
		if (this.locked) return;

		const blockDOM = findBlockDOM(this.view, event.clientY);
		if (!blockDOM) {
			this.hide();
			return;
		}

		const pos = blockPosFor(this.view, blockDOM);
		if (pos === null) {
			this.hide();
			return;
		}

		const blockRect = blockDOM.getBoundingClientRect();
		const containerRect = this.container.getBoundingClientRect();
		this.element.style.top = `${blockRect.top - containerRect.top}px`;
		this.element.style.left = `${blockRect.left - containerRect.left}px`;

		if (pos !== this.currentPos) {
			this.currentPos = pos;
			this.onChange(pos);
		}
	};

	private onMouseLeave = () => {
		if (this.locked) return;
		this.hide();
	};

	private hide() {
		if (this.currentPos === null) return;
		this.currentPos = null;
		this.onChange(null);
	}

	update(view: EditorView) {
		this.view = view;
		if (!view.editable && this.currentPos !== null) {
			this.hide();
		}
	}

	destroy() {
		this.container.removeEventListener('mousemove', this.onMouseMove);
		this.container.removeEventListener('mouseleave', this.onMouseLeave);
		this.element.remove();
	}
}

export const createDragHandlePlugin = ({
	key,
	element,
	onChange,
	onReady
}: {
	key: PluginKey;
	element: HTMLElement;
	onChange: (pos: number | null) => void;
	onReady: (controller: DragHandleController) => void;
}) =>
	new Plugin({
		key,
		view(view) {
			const handleView = new DragHandleView(view, element, onChange);
			onReady(handleView.controller);
			return handleView;
		}
	});

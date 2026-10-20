import { Plugin, type PluginKey, type PluginView } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/** Horizontal probe into the content area, in px from its left edge. */
const PROBE_INSET = 24;

/**
 * Marks the element the plugin positions.
 *
 * `ReactRenderer` hands back a plain wrapper, and a `top`/`left` written to a
 * statically positioned element does nothing — so the class the stylesheet
 * makes absolute has to be on that wrapper, not on the handle inside it.
 */
const ANCHOR_CLASS = 'blockleaf-block-handle-anchor';

/** Space between the handle and the block it belongs to, in px. */
const HANDLE_GAP = 4;

/** Used until the handle has been laid out and can report its own width. */
const FALLBACK_HANDLE_WIDTH = 46;

/**
 * Whether the primary pointer is a finger.
 *
 * A touch device never fires `mousemove`, so a handle that only appears on
 * hover is a handle that never appears — and with it goes every block action
 * on a phone. On a coarse pointer the handle follows the caret instead.
 */
const COARSE_POINTER = '(pointer: coarse)';

/** The menu the handle opens, which lives in a portal on the body. */
const BLOCK_MENU_SELECTOR = '.blockleaf-block-menu';

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

/** The DOM of the depth-1 block holding the selection, if there is one. */
const blockDOMForSelection = (view: EditorView): HTMLElement | null => {
	const { $from } = view.state.selection;
	if ($from.depth === 0) return null;

	const dom = view.nodeDOM($from.before(1));
	return dom instanceof HTMLElement ? dom : null;
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
	private pointerQuery: MediaQueryList | null = null;
	private coarse = false;

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

		this.element.classList.add(ANCHOR_CLASS);
		this.container.appendChild(this.element);
		this.container.addEventListener('mousemove', this.onMouseMove);
		this.container.addEventListener('mouseleave', this.onMouseLeave);

		// Watched rather than read once: a laptop with a touchscreen is both,
		// and which one it is depends on what the reader last touched.
		this.pointerQuery = window.matchMedia?.(COARSE_POINTER) ?? null;
		this.coarse = this.pointerQuery?.matches ?? false;
		this.pointerQuery?.addEventListener('change', this.onPointerChange);
	}

	/**
	 * Whether the handle, or the menu it opened, holds focus.
	 *
	 * The menu takes focus before it reports itself open, so for that moment
	 * the editor has lost the caret and nothing has locked the handle yet.
	 */
	private focusIsOnTheHandle(): boolean {
		const active = document.activeElement;
		return (
			active instanceof Element &&
			(this.element.contains(active) ||
				active.closest(BLOCK_MENU_SELECTOR) !== null)
		);
	}

	private onPointerChange = (event: MediaQueryListEvent) => {
		this.coarse = event.matches;
		this.hide();
	};

	/**
	 * Puts the handle beside the block holding the caret.
	 *
	 * The gutter it lands in is `--bl-content-padding`, which is `0` by
	 * default — `place` then clamps it to the container's edge and it overlaps
	 * the first characters. That is the same trade hovering already makes, and
	 * the cure is the same: give the content a gutter.
	 */
	private trackSelection() {
		const blockDOM = blockDOMForSelection(this.view);
		if (!blockDOM) {
			this.hide();
			return;
		}

		const pos = blockPosFor(this.view, blockDOM);
		if (pos === null) {
			this.hide();
			return;
		}

		this.place(blockDOM);

		if (pos !== this.currentPos) {
			this.currentPos = pos;
			this.onChange(pos);
		}
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

		this.place(blockDOM);

		if (pos !== this.currentPos) {
			this.currentPos = pos;
			this.onChange(pos);
		}
	};

	/**
	 * Puts the handle in the gutter beside the block.
	 *
	 * The shift is applied here rather than with a CSS `translateX`, because
	 * the gutter is whatever padding the host gave the content and
	 * `--bl-content-padding` is `0` by default. A transform cannot know that,
	 * so it pushed the handle outside the editor on every default setup — and
	 * any ancestor with `overflow: auto` then clipped it. Clamping to the
	 * container's left edge keeps it reachable in a narrow gutter; it overlaps
	 * the text rather than disappearing.
	 */
	private place(blockDOM: HTMLElement) {
		const blockRect = blockDOM.getBoundingClientRect();
		const containerRect = this.container.getBoundingClientRect();
		const width = this.element.offsetWidth || FALLBACK_HANDLE_WIDTH;
		const gutter = blockRect.left - containerRect.left;

		this.element.style.top = `${blockRect.top - containerRect.top}px`;
		this.element.style.left = `${Math.max(0, gutter - width - HANDLE_GAP)}px`;
	}

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
		if (!view.editable) {
			if (this.currentPos !== null) this.hide();
			return;
		}
		if (this.locked || !this.coarse) return;

		// Only while the editor holds the caret — a handle left hanging beside
		// the last block someone tapped is clutter, not an affordance. Tapping
		// the handle itself blurs the editor before the click lands, so focus
		// inside the handle or its menu counts as holding the caret; otherwise
		// the handle unmounts under the finger and the tap hits nothing.
		if (view.hasFocus() || this.focusIsOnTheHandle()) {
			this.trackSelection();
		} else {
			this.hide();
		}
	}

	destroy() {
		this.container.removeEventListener('mousemove', this.onMouseMove);
		this.container.removeEventListener('mouseleave', this.onMouseLeave);
		this.pointerQuery?.removeEventListener('change', this.onPointerChange);
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

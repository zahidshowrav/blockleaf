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

		this.element.classList.add(ANCHOR_CLASS);
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

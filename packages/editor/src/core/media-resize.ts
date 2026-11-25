import { Extension } from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
	NodeSelection,
	Plugin,
	PluginKey,
	type EditorState,
	type PluginView
} from '@tiptap/pm/state';
import { type EditorView } from '@tiptap/pm/view';

import {
	EMBED_NODE,
	MEDIA_RESIZE_EXTENSION_NAME,
	VIDEO_NODE
} from './constants.js';
import { FULL_WIDTH, readMediaWidth, type MediaWidth } from './media-width.js';

/** The blocks a resize applies to: pictures that have a shape. */
const RESIZABLE: ReadonlySet<string> = new Set([
	'image',
	VIDEO_NODE,
	EMBED_NODE
]);

/** Narrower than this and a picture stops being one. */
export const MIN_MEDIA_WIDTH = 64;

/** How far one press of the resize shortcut moves, as a share of the page. */
const KEY_STEP = 0.1;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mediaResize: {
			/**
			 * Sets the selected image's or video's width: pixels, `'full'`,
			 * or `null` for the file's own size. Pixels are kept
			 * to at least 64.
			 */
			setMediaWidth: (width: MediaWidth | null) => ReturnType;
			/** Full width on the selected image or video, or back off it. */
			toggleMediaFullWidth: () => ReturnType;
		};
	}
}

/** The selected image or video, and where it is. */
const selectedMedia = (
	state: EditorState
): { node: ProseMirrorNode; pos: number } | null => {
	const { selection } = state;
	if (!(selection instanceof NodeSelection)) return null;
	return RESIZABLE.has(selection.node.type.name)
		? { node: selection.node, pos: selection.from }
		: null;
};

/** The width a picture can grow to: the editor's own content box. */
const pageWidth = (view: EditorView): number => {
	const style = view.dom.ownerDocument.defaultView?.getComputedStyle(
		view.dom
	);
	const padding =
		(Number.parseFloat(style?.paddingLeft ?? '0') || 0) +
		(Number.parseFloat(style?.paddingRight ?? '0') || 0);
	return Math.max(MIN_MEDIA_WIDTH, view.dom.clientWidth - padding);
};

const clamp = (width: number, max: number) =>
	Math.round(Math.min(Math.max(width, MIN_MEDIA_WIDTH), max));

/**
 * The handles drawn over a selected image or video: one on each side edge,
 * none on the top or bottom, because only the width may change.
 *
 * An overlay rather than a node view, so the image keeps the exact markup
 * it has without this subpath, and with it every stylesheet and selector
 * written against that markup.
 */
class ResizeView implements PluginView {
	private readonly element: HTMLElement;
	private readonly container: HTMLElement;
	private view: EditorView;
	/** Set while a handle is being dragged. */
	private drag: {
		target: HTMLElement;
		pos: number;
		startX: number;
		startWidth: number;
		/** -1 for the left handle, 1 for the right one. */
		direction: number;
		/** 2 for a centred picture, which grows on both sides at once. */
		factor: number;
		width: number;
	} | null = null;

	constructor(view: EditorView) {
		this.view = view;
		const document_ = view.dom.ownerDocument;
		this.container =
			(view.dom.closest('.blockleaf-editor') as HTMLElement | null) ??
			(view.dom.parentElement as HTMLElement);

		this.element = document_.createElement('div');
		this.element.className = 'blockleaf-resize';
		// Pointer only: the keyboard has the shortcuts and the toolbar's full
		// width button, so the handles are not announced or focusable.
		this.element.setAttribute('aria-hidden', 'true');
		this.element.hidden = true;
		for (const side of ['left', 'right'] as const) {
			const handle = document_.createElement('div');
			handle.className = 'blockleaf-resize__handle';
			handle.dataset.side = side;
			handle.addEventListener('pointerdown', (event) =>
				this.start(event, side === 'left' ? -1 : 1)
			);
			this.element.append(handle);
		}
		this.container.append(this.element);
		this.update(view);
	}

	private target(): {
		dom: HTMLElement;
		node: ProseMirrorNode;
		pos: number;
	} | null {
		if (!this.view.editable) return null;
		const media = selectedMedia(this.view.state);
		if (!media) return null;
		const dom = this.view.nodeDOM(media.pos);
		return dom instanceof HTMLElement ? { dom, ...media } : null;
	}

	private place(dom: HTMLElement) {
		const rect = dom.getBoundingClientRect();
		const box = this.container.getBoundingClientRect();
		Object.assign(this.element.style, {
			top: `${rect.top - box.top}px`,
			left: `${rect.left - box.left}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`
		});
	}

	update(view: EditorView) {
		this.view = view;
		if (this.drag) return;
		const target = this.target();
		this.element.hidden = !target;
		if (target) this.place(target.dom);
	}

	private start(event: PointerEvent, direction: number) {
		const target = this.target();
		if (!target || event.button !== 0) return;
		event.preventDefault();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture?.(event.pointerId);
		const width = target.dom.getBoundingClientRect().width;
		this.drag = {
			target: target.dom,
			pos: target.pos,
			startX: event.clientX,
			startWidth: width,
			direction,
			factor: target.node.attrs.align === 'center' ? 2 : 1,
			width
		};
		this.element.dataset.resizing = 'true';
		handle.addEventListener('pointermove', this.move);
		handle.addEventListener('pointerup', this.end);
		handle.addEventListener('pointercancel', this.end);
	}

	private move = (event: PointerEvent) => {
		const drag = this.drag;
		if (!drag) return;
		const moved = (event.clientX - drag.startX) * drag.direction;
		drag.width = clamp(
			drag.startWidth + moved * drag.factor,
			pageWidth(this.view)
		);
		// Shown straight away, stored once on release: one undo step and one
		// `onChange` per drag, not one per pixel.
		drag.target.style.width = `${drag.width}px`;
		this.place(drag.target);
	};

	private end = (event: PointerEvent) => {
		const drag = this.drag;
		const handle = event.currentTarget as HTMLElement;
		handle.removeEventListener('pointermove', this.move);
		handle.removeEventListener('pointerup', this.end);
		handle.removeEventListener('pointercancel', this.end);
		delete this.element.dataset.resizing;
		this.drag = null;
		if (!drag) return;
		drag.target.style.removeProperty('width');
		if (event.type === 'pointerup' && drag.width !== drag.startWidth) {
			const { state } = this.view;
			const node = state.doc.nodeAt(drag.pos);
			if (node && RESIZABLE.has(node.type.name)) {
				const tr = state.tr.setNodeAttribute(
					drag.pos,
					'width',
					drag.width
				);
				tr.setSelection(NodeSelection.create(tr.doc, drag.pos));
				this.view.dispatch(tr);
			}
		}
		this.update(this.view);
	};

	destroy() {
		this.element.remove();
	}
}

/**
 * Resizing for images, videos and embeds, from
 * `@blockleaf/editor/media`: a handle on each side of a selected one, the
 * width only, with the height following the picture's own shape. And full
 * width, a named value rather than a pixel count.
 *
 * `Alt-Shift-ArrowLeft` and `Alt-Shift-ArrowRight` narrow and widen a
 * selected one by a tenth of the page, for a keyboard.
 */
export const MediaResize = /* @__PURE__ */ Extension.create({
	name: MEDIA_RESIZE_EXTENSION_NAME,

	addCommands() {
		return {
			setMediaWidth:
				(width) =>
				({ state, tr, dispatch }) => {
					const media = selectedMedia(state);
					if (!media) return false;
					const value =
						width === null || width === FULL_WIDTH
							? width
							: readMediaWidth(Math.max(width, MIN_MEDIA_WIDTH));
					if (width !== null && value === null) return false;
					if (dispatch) {
						tr.setNodeAttribute(media.pos, 'width', value);
						tr.setSelection(
							NodeSelection.create(tr.doc, media.pos)
						);
					}
					return true;
				},
			toggleMediaFullWidth:
				() =>
				({ state, commands }) => {
					const media = selectedMedia(state);
					if (!media) return false;
					return commands.setMediaWidth(
						media.node.attrs.width === FULL_WIDTH
							? null
							: FULL_WIDTH
					);
				}
		};
	},

	addKeyboardShortcuts() {
		const step = (direction: number) => () => {
			const { view, state } = this.editor;
			const media = selectedMedia(state);
			if (!media) return false;
			const dom = view.nodeDOM(media.pos);
			const page = pageWidth(view);
			const current =
				dom instanceof HTMLElement &&
				dom.getBoundingClientRect().width > 0
					? dom.getBoundingClientRect().width
					: page;
			return this.editor.commands.setMediaWidth(
				clamp(current + direction * page * KEY_STEP, page)
			);
		};
		return {
			'Alt-Shift-ArrowLeft': step(-1),
			'Alt-Shift-ArrowRight': step(1)
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockleafMediaResize'),
				view: (view) => new ResizeView(view)
			})
		];
	}
});

import { mergeAttributes, Node } from '@tiptap/core';
import {
	DOMParser as PMDOMParser,
	type Fragment,
	type Node as ProseMirrorNode,
	type ResolvedPos,
	type Schema
} from '@tiptap/pm/model';
import {
	type EditorState,
	Plugin,
	PluginKey,
	TextSelection,
	type Transaction
} from '@tiptap/pm/state';

import { DETAILS_NODE } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';

export interface DetailsOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		details: {
			/** Wraps the selected blocks in a toggle, open. The first becomes its title. */
			setDetails: () => ReturnType;
			toggleDetails: () => ReturnType;
			/** Takes the blocks out of the toggle around the selection, title included. */
			unsetDetails: () => ReturnType;
			/** Opens or closes the toggle around the selection. */
			toggleDetailsOpen: () => ReturnType;
		};
	}
}

interface FoundDetails {
	node: ProseMirrorNode;
	pos: number;
	depth: number;
}

/** The innermost toggle around a position. */
const detailsAround = ($pos: ResolvedPos): FoundDetails | null => {
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		const node = $pos.node(depth);
		if (node.type.name === DETAILS_NODE) {
			return { node, pos: $pos.before(depth), depth };
		}
	}
	return null;
};

/**
 * The toggle whose title the caret is directly in — a textblock that is the
 * toggle's first child, not something nested deeper inside it.
 */
const titleAround = (state: EditorState): FoundDetails | null => {
	const { selection } = state;
	if (!selection.empty) return null;
	const found = detailsAround(selection.$from);
	if (!found) return null;
	const { $from } = selection;
	const inTitle =
		$from.depth === found.depth + 1 &&
		$from.index(found.depth) === 0 &&
		$from.parent.isTextblock;
	return inTitle ? found : null;
};

const isOpen = (node: ProseMirrorNode): boolean => node.attrs.open === true;

/**
 * Opens or closes the toggle at `pos`. Closing it with the caret inside the
 * body moves the caret to the end of the title, so it is never left inside
 * content nobody can see.
 */
const toggleOpenAt = (tr: Transaction, pos: number): boolean => {
	const node = tr.doc.nodeAt(pos);
	if (node?.type.name !== DETAILS_NODE) return false;
	const open = !isOpen(node);
	tr.setNodeMarkup(pos, undefined, { ...node.attrs, open });

	const title = node.firstChild;
	if (!open && title) {
		const bodyStart = pos + 1 + title.nodeSize;
		const end = pos + node.nodeSize;
		if (tr.selection.to > bodyStart && tr.selection.from < end) {
			tr.setSelection(
				TextSelection.near(tr.doc.resolve(bodyStart - 1), -1)
			);
		}
	}
	return true;
};

/** Replaces the toggle at `pos` with its own blocks, title first. */
const unwrapAt = (tr: Transaction, found: FoundDetails): void => {
	tr.replaceWith(
		found.pos,
		found.pos + found.node.nodeSize,
		found.node.content
	);
};

/**
 * Reads `<details>` from HTML another app wrote. Its `<summary>` becomes the
 * title paragraph; the editor's own output has no `<summary>` and
 * needs nothing.
 */
const parseDetailsContent = (dom: HTMLElement, schema: Schema): Fragment => {
	const type = schema.nodes[DETAILS_NODE];
	const clone = dom.cloneNode(true) as HTMLElement;
	const summary = Array.from(clone.children).find(
		(child) => child.tagName === 'SUMMARY'
	);
	if (summary) {
		const title = clone.ownerDocument.createElement('p');
		title.append(...Array.from(summary.childNodes));
		summary.replaceWith(title);
	}
	if (!type) return PMDOMParser.fromSchema(schema).parse(clone).content;
	return PMDOMParser.fromSchema(schema).parse(clone, {
		topNode: type.create()
	}).content;
};

const SVG = 'http://www.w3.org/2000/svg';

const chevron = (document_: Document): SVGSVGElement => {
	const svg = document_.createElementNS(SVG, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', '16');
	svg.setAttribute('height', '16');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.setAttribute('aria-hidden', 'true');
	const path = document_.createElementNS(SVG, 'polyline');
	path.setAttribute('points', '9 18 15 12 9 6');
	svg.append(path);
	return svg;
};

/**
 * Opens a closed toggle when the caret ends up inside its hidden body.
 *
 * Typing never gets it there — the keyboard paths below go round the body —
 * but undo, a search or a host's own `setTextSelection` can. A caret inside
 * content that is not displayed types into nothing anyone can see.
 */
const revealSelection = (
	transactions: readonly Transaction[],
	state: EditorState
): Transaction | null => {
	if (!transactions.some((tr) => tr.selectionSet || tr.docChanged)) {
		return null;
	}
	let tr: Transaction | null = null;
	for (const $pos of [state.selection.$from, state.selection.$to]) {
		for (let depth = $pos.depth; depth > 0; depth -= 1) {
			const node = $pos.node(depth);
			if (
				node.type.name === DETAILS_NODE &&
				!isOpen(node) &&
				$pos.index(depth) > 0
			) {
				const pos = $pos.before(depth);
				const current = (tr ?? state.tr).doc.nodeAt(pos);
				if (current && !isOpen(current)) {
					tr ??= state.tr;
					tr.setNodeMarkup(pos, undefined, {
						...current.attrs,
						open: true
					});
				}
			}
		}
	}
	// Not an edit of its own: undoing what moved the caret should not need a
	// second undo to close the toggle again.
	return tr?.setMeta('addToHistory', false) ?? null;
};

/**
 * A toggle block. The first block inside it is its title; the
 * blocks after it are the body, shown or hidden by `open`.
 *
 * The stored shape is the one `details` has had since `0.1.0` — this adds the
 * editing, not the node.
 */
export const Details = /* @__PURE__ */ Node.create<DetailsOptions>({
	name: DETAILS_NODE,
	group: 'block',
	content: 'block+',
	defining: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			labels: defaultLabels
		};
	},

	addAttributes() {
		return {
			open: {
				default: false,
				keepOnSplit: false,
				parseHTML: (element) => element.hasAttribute('open'),
				renderHTML: (attributes) =>
					attributes.open === true ? { open: '' } : {}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'details',
				getContent: (dom, schema) =>
					parseDetailsContent(dom as HTMLElement, schema)
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'details',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-details'
			}),
			0
		];
	},

	addNodeView() {
		const { labels } = this.options;
		return ({ node: initial, getPos, editor }) => {
			let node = initial;
			// Not `editor.view`: node views are built while the view itself is
			// still being constructed. They only ever run in a browser.
			const document_ = globalThis.document;

			const dom = document_.createElement('div');
			dom.className = 'blockleaf-details';
			dom.dataset.type = DETAILS_NODE;

			// Out of the tab order: inside an editor, Tab belongs to the
			// document. The keyboard path is Mod-Enter in the title.
			const button = document_.createElement('button');
			button.type = 'button';
			button.className = 'blockleaf-details__toggle';
			button.contentEditable = 'false';
			button.tabIndex = -1;
			button.setAttribute('aria-label', labels.details.toggle);
			button.append(chevron(document_));

			const content = document_.createElement('div');
			content.className = 'blockleaf-details__content';
			dom.append(button, content);

			const sync = () => {
				const open = isOpen(node);
				dom.toggleAttribute('data-open', open);
				button.setAttribute('aria-expanded', String(open));
				const id: unknown = node.attrs.id;
				if (typeof id === 'string') dom.dataset.id = id;
				else delete dom.dataset.id;
			};
			sync();

			// Keeps the caret where it was rather than dropping it on the button.
			button.addEventListener('mousedown', (event) =>
				event.preventDefault()
			);
			button.addEventListener('click', (event) => {
				event.preventDefault();
				const pos = getPos();
				if (typeof pos !== 'number' || !editor.isEditable) return;
				editor
					.chain()
					.focus(undefined, { scrollIntoView: false })
					.command(({ tr }) => toggleOpenAt(tr, pos))
					.run();
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
					button.contains(event.target),
				ignoreMutation: (mutation) =>
					mutation.type !== 'selection' &&
					!content.contains(mutation.target)
			};
		};
	},

	addCommands() {
		return {
			setDetails:
				() =>
				({ commands }) =>
					commands.wrapIn(this.name, { open: true }),
			toggleDetails:
				() =>
				({ commands }) =>
					commands.toggleWrap(this.name, { open: true }),
			unsetDetails:
				() =>
				({ state, tr, dispatch }) => {
					const found = detailsAround(state.selection.$from);
					if (!found) return false;
					if (dispatch) unwrapAt(tr, found);
					return true;
				},
			toggleDetailsOpen:
				() =>
				({ state, tr, dispatch }) => {
					const found = detailsAround(state.selection.$from);
					if (!found) return false;
					return dispatch ? toggleOpenAt(tr, found.pos) : true;
				}
		};
	},

	addKeyboardShortcuts() {
		// Enter at the end of a closed toggle's title starts a block after the
		// toggle, not a line inside a body nobody can see. Anywhere else in a
		// closed title it opens the toggle first, so the split is visible.
		const enter = () => {
			const { state } = this.editor;
			const found = titleAround(state);
			if (!found || isOpen(found.node)) return false;
			const { $from } = state.selection;
			if ($from.parentOffset < $from.parent.content.size) {
				return this.editor
					.chain()
					.command(({ tr }) => toggleOpenAt(tr, found.pos))
					.splitBlock()
					.run();
			}
			const after = found.pos + found.node.nodeSize;
			// An empty paragraph already after the toggle — the trailing one,
			// usually — is where the caret goes, rather than beside a second.
			const next = state.doc.resolve(after).nodeAfter;
			if (next?.type.name === 'paragraph' && next.content.size === 0) {
				return this.editor.commands.setTextSelection(after + 1);
			}
			const paragraph = state.schema.nodes.paragraph;
			if (!paragraph) return false;
			return this.editor
				.chain()
				.command(({ tr }) => {
					tr.insert(after, paragraph.create());
					tr.setSelection(TextSelection.create(tr.doc, after + 1));
					return true;
				})
				.scrollIntoView()
				.run();
		};

		// Backspace at the start of the title turns the toggle back into its
		// blocks, rather than joining the title into the block above it.
		const backspace = () => {
			const { state } = this.editor;
			const found = titleAround(state);
			if (!found || state.selection.$from.parentOffset > 0) return false;
			return this.editor.commands.command(({ tr }) => {
				unwrapAt(tr, found);
				return true;
			});
		};

		return {
			Enter: enter,
			Backspace: backspace,
			// Anywhere inside the toggle. Closing it from the body moves the
			// caret to the title.
			'Mod-Enter': () => this.editor.commands.toggleDetailsOpen()
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('blockleafDetails'),
				appendTransaction: (transactions, _oldState, state) =>
					revealSelection(transactions, state)
			})
		];
	}
});

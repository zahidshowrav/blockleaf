import { type Extensions, mergeAttributes, Node } from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, type Transaction } from '@tiptap/pm/state';

import { TABLE_OF_CONTENTS_NODE } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';
import {
	sameTableOfContents,
	tableOfContentsOf,
	type TableOfContentsEntry
} from '../toc.js';

export interface TableOfContentsOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		tableOfContents: {
			/** Inserts a table of contents at the selection. */
			insertTableOfContents: () => ReturnType;
			/** Puts the caret at the start of the heading with this block id, and scrolls to it. */
			goToHeading: (id: string) => ReturnType;
		};
	}
}

const CLASS_NAME = 'blockleaf-toc';

/** Where the heading with this id starts, or `null`. */
const headingPos = (doc: ProseMirrorNode, id: string): number | null => {
	let found: number | null = null;
	doc.descendants((node, pos) => {
		if (found !== null) return false;
		if (node.type.name === 'heading' && node.attrs.id === id) {
			found = pos;
			return false;
		}
		return true;
	});
	return found;
};

const moveToHeading = (tr: Transaction, id: string): boolean => {
	const pos = headingPos(tr.doc, id);
	if (pos === null) return false;
	tr.setSelection(TextSelection.create(tr.doc, pos + 1)).scrollIntoView();
	return true;
};

/**
 * Draws the list into `dom`. Links point at `#<id>` like the renderer's, so
 * a link opened in a new tab or copied still means the heading; a click in
 * the editor moves the caret instead of the page's hash.
 */
const draw = (
	dom: HTMLElement,
	entries: readonly TableOfContentsEntry[],
	labels: ResolvedLabels
): void => {
	const document_ = dom.ownerDocument;
	if (!entries.length) {
		const empty = document_.createElement('p');
		empty.className = `${CLASS_NAME}__empty`;
		empty.textContent = labels.tableOfContents.empty;
		dom.replaceChildren(empty);
		return;
	}
	const list = document_.createElement('ul');
	for (const entry of entries) {
		const item = document_.createElement('li');
		item.dataset.depth = String(entry.depth);
		if (entry.id) {
			const link = document_.createElement('a');
			link.href = `#${entry.id}`;
			link.dataset.headingId = entry.id;
			link.textContent = entry.text;
			item.append(link);
		} else {
			item.textContent = entry.text;
		}
		list.append(item);
	}
	dom.replaceChildren(list);
};

/**
 * A table of contents: a block that lists the document's headings,
 * each linking to its heading. It stores nothing but its id — the
 * list is worked out each time it is drawn, so it is never stale.
 *
 * The node is plain DOM, with no React, so it stays in the core.
 */
export const TableOfContents =
	/* @__PURE__ */ Node.create<TableOfContentsOptions>({
		name: TABLE_OF_CONTENTS_NODE,
		group: 'block',
		atom: true,
		selectable: true,
		draggable: false,

		addOptions() {
			return {
				HTMLAttributes: {},
				labels: defaultLabels
			};
		},

		parseHTML() {
			return [{ tag: `nav[data-type="${TABLE_OF_CONTENTS_NODE}"]` }];
		},

		// No entries in `getHTML`: a node can only write itself, and the list is
		// made of other nodes. `@blockleaf/renderer` writes the full list.
		renderHTML({ HTMLAttributes }) {
			return [
				'nav',
				mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
					'data-type': TABLE_OF_CONTENTS_NODE,
					class: CLASS_NAME,
					'aria-label': this.options.labels.tableOfContents.label
				})
			];
		},

		renderText() {
			return '';
		},

		addNodeView() {
			const { labels } = this.options;
			return ({ node: initial, editor }) => {
				let node = initial;
				const dom = globalThis.document.createElement('nav');
				dom.className = CLASS_NAME;
				dom.dataset.type = TABLE_OF_CONTENTS_NODE;
				dom.contentEditable = 'false';
				dom.setAttribute('aria-label', labels.tableOfContents.label);

				let entries: TableOfContentsEntry[] = [];
				const sync = () => {
					const id: unknown = node.attrs.id;
					if (typeof id === 'string') dom.dataset.id = id;
					else delete dom.dataset.id;
					const next = tableOfContentsOf(editor.state.doc);
					if (dom.firstChild && sameTableOfContents(entries, next)) {
						return;
					}
					entries = next;
					draw(dom, entries, labels);
				};
				sync();

				// `transaction`, not `update`: a host's `setContent` with
				// `emitUpdate: false` changes the headings without an `update`.
				const onTransaction = ({
					transaction
				}: {
					transaction: Transaction;
				}) => {
					if (transaction.docChanged) sync();
				};
				editor.on('transaction', onTransaction);

				dom.addEventListener('click', (event) => {
					const target = event.target;
					if (!(target instanceof globalThis.Element)) return;
					const link =
						target.closest<HTMLAnchorElement>('a[data-heading-id]');
					if (!link?.dataset.headingId) return;
					event.preventDefault();
					editor.commands.goToHeading(link.dataset.headingId);
				});

				return {
					dom,
					update: (next) => {
						if (next.type !== node.type) return false;
						node = next;
						sync();
						return true;
					},
					// Links take their own clicks and keys; anything else on the
					// block selects it, like any other atom.
					stopEvent: (event) =>
						event.target instanceof globalThis.Element &&
						event.target.closest('a') !== null,
					ignoreMutation: () => true,
					destroy: () => {
						editor.off('transaction', onTransaction);
					}
				};
			};
		},

		addCommands() {
			return {
				insertTableOfContents:
					() =>
					({ commands }) =>
						commands.insertContent({ type: this.name }),
				goToHeading:
					(id) =>
					({ tr, dispatch, view }) => {
						if (!moveToHeading(tr, id)) return false;
						if (dispatch) view.focus();
						return true;
					}
			};
		}
	});

/** The table of contents block, configured. */
export const createTableOfContents = (
	options: Partial<TableOfContentsOptions> = {}
): Extensions => [TableOfContents.configure(options)];

/**
 * Adds the table of contents block to an extension list, replacing one
 * already there.
 *
 * ```ts
 * const extensions = withTableOfContents(presets.standard());
 * ```
 */
export const withTableOfContents = (
	extensions: Extensions,
	options: Partial<TableOfContentsOptions> = {}
): Extensions => [
	...extensions.filter(
		(extension) => extension.name !== TABLE_OF_CONTENTS_NODE
	),
	...createTableOfContents(options)
];

import { type Editor, type NodeViewRendererProps } from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { type NodeView } from '@tiptap/pm/view';

import { type MathLabels } from '@blockleaf/editor';

import { renderLatex, type RenderLatexOptions } from './render-latex.js';

/**
 * Asks the node view at a position to open its field. Dispatched on the
 * node's DOM by the Enter key, so the keymap does not need a handle on the
 * view itself.
 */
export const OPEN_EVENT = 'blockleaf-math-open';

export interface MathViewOptions {
	block: boolean;
	labels: MathLabels;
	render: Omit<RenderLatexOptions, 'block'>;
}

const latexOf = (node: ProseMirrorNode): string =>
	typeof node.attrs.latex === 'string' ? node.attrs.latex : '';

/**
 * A formula in the editor: drawn, and opened into a field by a click, by
 * Enter while it is selected, or as soon as an empty one is inserted. The
 * formula above the field is the preview; it is redrawn on every key.
 *
 * Plain DOM, not React, so the package works with any editor setup and
 * adds nothing for a host that never renders React chrome.
 */
export const createMathView =
	(options: MathViewOptions) =>
	({ node: initial, editor, getPos }: NodeViewRendererProps): NodeView => {
		let node = initial;
		const { block, labels } = options;

		const dom = document.createElement(block ? 'div' : 'span');
		dom.className = 'blockleaf-math';
		dom.dataset.type = node.type.name;
		dom.contentEditable = 'false';

		const formula = document.createElement('span');
		formula.className = 'blockleaf-math__formula';
		dom.append(formula);

		let panel: HTMLElement | null = null;
		let input: HTMLTextAreaElement | null = null;
		let original = '';

		const draw = (latex: string) => {
			delete dom.dataset.invalid;
			delete dom.dataset.empty;
			formula.removeAttribute('role');
			formula.removeAttribute('aria-label');

			if (latex.trim() === '') {
				dom.dataset.empty = '';
				formula.textContent = labels.empty;
				return;
			}

			const result = renderLatex(latex, { ...options.render, block });
			if (result.ok) {
				formula.innerHTML = result.html;
				return;
			}
			dom.dataset.invalid = '';
			formula.textContent = latex;
			formula.setAttribute('role', 'img');
			formula.setAttribute('aria-label', labels.invalid(latex));
		};

		const position = (): number | null => {
			const pos = typeof getPos === 'function' ? getPos() : undefined;
			return typeof pos === 'number' ? pos : null;
		};

		/** Puts the caret just after the formula and gives focus back. */
		const leave = (editorRef: Editor, pos: number) => {
			const { state, view } = editorRef;
			const current = state.doc.nodeAt(pos);
			const after = pos + (current?.nodeSize ?? 0);
			const selection = current
				? TextSelection.near(state.doc.resolve(after))
				: TextSelection.near(state.doc.resolve(pos));
			view.dispatch(state.tr.setSelection(selection));
			view.focus();
		};

		const close = (latex: string, keepSelected = false) => {
			if (!panel) return;
			// Cleared before the removal, so a `focusout` the removal fires
			// finds nothing open and does not close a second time.
			const closing = panel;
			panel = null;
			input = null;
			closing.remove();
			delete dom.dataset.editing;

			const pos = position();
			if (pos === null) return;
			const { state, view } = editor;
			const current = state.doc.nodeAt(pos);
			if (current?.type !== node.type) return;

			// An empty formula is not worth keeping: closing one, typed or
			// cancelled, takes it out, as it does a new one never filled in.
			if (latex.trim() === '') {
				view.dispatch(
					state.tr
						.delete(pos, pos + current.nodeSize)
						.scrollIntoView()
				);
				view.focus();
				return;
			}

			if (latex !== latexOf(current)) {
				view.dispatch(
					state.tr.setNodeMarkup(pos, undefined, {
						...current.attrs,
						latex
					})
				);
			} else {
				draw(latex);
			}

			if (keepSelected) {
				const { state: next } = editor;
				view.dispatch(
					next.tr.setSelection(NodeSelection.create(next.doc, pos))
				);
				view.focus();
				return;
			}
			leave(editor, pos);
		};

		const open = () => {
			if (panel || !editor.isEditable) return;
			original = latexOf(node);

			panel = document.createElement('span');
			panel.className = 'blockleaf-math__panel';

			input = document.createElement('textarea');
			input.className = 'blockleaf-math__input';
			input.rows = block ? 3 : 1;
			input.value = original;
			input.placeholder = labels.placeholder;
			input.setAttribute('aria-label', labels.source);
			input.spellcheck = false;
			input.setAttribute('autocapitalize', 'off');
			input.setAttribute('autocomplete', 'off');

			const done = document.createElement('button');
			done.type = 'button';
			done.className = 'blockleaf-math__done';
			done.textContent = labels.done;

			input.addEventListener('input', () => {
				if (input) draw(input.value);
			});
			input.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					draw(original);
					close(original, true);
				} else if (event.key === 'Enter' && !event.shiftKey) {
					// Shift+Enter is a new line, for a long block formula.
					event.preventDefault();
					close(input?.value ?? original);
				}
			});
			done.addEventListener('click', () =>
				close(input?.value ?? original)
			);
			// Leaving the field by any other way keeps what was typed.
			panel.addEventListener('focusout', (event) => {
				if (!panel) return;
				const next = event.relatedTarget;
				if (next instanceof Node && panel.contains(next)) return;
				close(input?.value ?? original);
			});

			panel.append(input, done);
			dom.append(panel);
			dom.dataset.editing = '';
			input.focus();
			input.select();
		};

		const onOpenRequest = () => open();
		const onClick = (event: MouseEvent) => {
			if (panel?.contains(event.target as Node)) return;
			event.preventDefault();
			open();
		};

		dom.addEventListener(OPEN_EVENT, onOpenRequest);
		formula.addEventListener('click', onClick);

		draw(latexOf(node));

		// A formula inserted empty, from the slash menu or `$$`, opens
		// straight away. Only while the editor has focus: one stored empty
		// must not take the caret when a page loads.
		if (
			latexOf(node) === '' &&
			editor.isEditable &&
			editor.view.hasFocus()
		) {
			queueMicrotask(open);
		}

		return {
			dom,
			update: (updated) => {
				if (updated.type !== node.type) return false;
				node = updated;
				if (!panel) draw(latexOf(node));
				return true;
			},
			stopEvent: (event) =>
				panel !== null && panel.contains(event.target as Node),
			ignoreMutation: () => true,
			destroy: () => {
				dom.removeEventListener(OPEN_EVENT, onOpenRequest);
				formula.removeEventListener('click', onClick);
			}
		};
	};

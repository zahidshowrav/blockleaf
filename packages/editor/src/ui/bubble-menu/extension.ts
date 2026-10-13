import { Extension } from '@tiptap/core';
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { ReactRenderer } from '@tiptap/react';

import { resolveBubbleActions } from './actions.js';
import { BubbleMenu } from './bubble-menu.js';
import type {
	BubbleMenuOptions,
	BubbleMenuProps,
	BubbleMenuShouldShow
} from './types.js';

export const BUBBLE_MENU_PLUGIN_KEY = 'blockleafBubbleMenu';

type BubbleMenuStorage = {
	renderer: ReactRenderer<unknown, BubbleMenuProps> | null;
	openLinkRequest: number;
};

/**
 * Shown for a non-empty text selection in an editable document, except inside
 * a code block — where none of these marks can apply, so a toolbar offering
 * them would be lying.
 */
const defaultShouldShow: BubbleMenuShouldShow = ({
	editor,
	state,
	from,
	to
}) => {
	if (!editor.isEditable) return false;
	if (from === to) return false;
	if (editor.isActive('codeBlock')) return false;

	// A cell selection belongs to the cell menu (CH-08). Two toolbars
	// fighting over the same selection is worse than either of them.
	// Shape-checked rather than `instanceof CellSelection` — see
	// `isCellSelection` for why that import is not worth its weight.
	if ('$anchorCell' in state.selection) return false;

	// An empty-but-not-collapsed range (a selected image, a gap) has no text
	// to format.
	return state.doc.textBetween(from, to, ' ').trim().length > 0;
};

export const BubbleMenuExtension =
	/* @__PURE__ */ Extension.create<BubbleMenuOptions>({
		name: 'bubbleMenu',

		// Above the Link mark's own `Mod-k`, so the toolbar's link editor wins
		// over `toggleLink({ href: 'https://' })` when the chrome is present.
		priority: 200,

		addOptions() {
			return {
				actions: undefined,
				link: true,
				panel: undefined,
				label: undefined,
				pluginKey: BUBBLE_MENU_PLUGIN_KEY,
				updateDelay: undefined,
				shouldShow: undefined,
				appendTo: undefined
			};
		},

		addStorage(): BubbleMenuStorage {
			return { renderer: null, openLinkRequest: 0 };
		},

		addKeyboardShortcuts() {
			const openLinkEditor = () => {
				if (this.options.link === false) {
					return false;
				}

				const storage = this.storage as BubbleMenuStorage;
				if (this.editor.state.selection.empty) {
					return false;
				}
				if (!storage.renderer) {
					return false;
				}

				storage.openLinkRequest += 1;
				storage.renderer.updateProps({
					openLinkRequest: storage.openLinkRequest
				});
				return true;
			};

			return {
				'Mod-k': openLinkEditor,
				'Mod-K': openLinkEditor
			};
		},

		addProseMirrorPlugins() {
			const storage = this.storage as BubbleMenuStorage;
			const actions = resolveBubbleActions(this.options.actions);
			const link = this.options.link !== false;

			const renderer = new ReactRenderer<unknown, BubbleMenuProps>(
				BubbleMenu,
				{
					editor: this.editor,
					props: {
						editor: this.editor,
						actions,
						link,
						panel: this.options.panel,
						label: this.options.label,
						openLinkRequest: 0
					}
				}
			);
			storage.renderer = renderer;

			return [
				BubbleMenuPlugin({
					editor: this.editor,
					element: renderer.element as HTMLElement,
					pluginKey: this.options.pluginKey ?? BUBBLE_MENU_PLUGIN_KEY,
					updateDelay: this.options.updateDelay,
					shouldShow: this.options.shouldShow ?? defaultShouldShow,
					appendTo: this.options.appendTo,
					options: {
						placement: 'top',
						offset: 8,
						flip: true,
						shift: { padding: 8 }
					}
				})
			];
		},

		onDestroy() {
			const storage = this.storage as BubbleMenuStorage;
			storage.renderer?.destroy();
			storage.renderer = null;
		}
	});

export const createBubbleMenuExtension = (options: BubbleMenuOptions = {}) =>
	BubbleMenuExtension.configure(options);

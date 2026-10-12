import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';

import { resolveBlockActions } from './actions.js';
import { BlockHandle, type BlockHandleComponentProps } from './block-handle.js';
import { createDragHandlePlugin, type DragHandleController } from './plugin.js';
import type { DragHandleOptions } from './types.js';

export const DRAG_HANDLE_PLUGIN_KEY = /* @__PURE__ */ new PluginKey(
	'blockleafDragHandle'
);

type DragHandleStorage = {
	renderer: ReactRenderer<unknown, BlockHandleComponentProps> | null;
	controller: DragHandleController | null;
	openMenuRequest: number;
};

export const DragHandleExtension =
	/* @__PURE__ */ Extension.create<DragHandleOptions>({
		name: 'dragHandle',

		addOptions() {
			return {
				actions: undefined,
				insertButton: true,
				pluginKey: undefined
			};
		},

		addStorage(): DragHandleStorage {
			return { renderer: null, controller: null, openMenuRequest: 0 };
		},

		addKeyboardShortcuts() {
			/**
			 * `Shift+F10` is the platform's context-menu key, and the one a
			 * screen reader user will try first. The handle itself only
			 * appears on hover, so without this the block menu is
			 * mouse-only — which would fail the block's own exit test.
			 */
			const openBlockMenu = () => {
				const storage = this.storage as DragHandleStorage;
				if (!storage.renderer) return false;

				const { $from } = this.editor.state.selection;
				if ($from.depth === 0) return false;

				storage.openMenuRequest += 1;
				storage.renderer.updateProps({
					pos: $from.before(1),
					openMenuRequest: storage.openMenuRequest
				});
				storage.controller?.setLocked(true);
				return true;
			};

			return {
				'Shift-F10': openBlockMenu,
				'Mod-Alt-m': openBlockMenu,
				'Mod-Alt-M': openBlockMenu
			};
		},

		addProseMirrorPlugins() {
			const storage = this.storage as DragHandleStorage;
			const actions = resolveBlockActions(this.options.actions);
			const insertButton = this.options.insertButton !== false;

			const setLocked = (locked: boolean) =>
				storage.controller?.setLocked(locked);

			const renderer = new ReactRenderer<
				unknown,
				BlockHandleComponentProps
			>(BlockHandle, {
				editor: this.editor,
				props: {
					editor: this.editor,
					actions,
					insertButton,
					pos: null,
					onLockChange: setLocked
				}
			});
			storage.renderer = renderer;

			return [
				createDragHandlePlugin({
					key: this.options.pluginKey ?? DRAG_HANDLE_PLUGIN_KEY,
					element: renderer.element as HTMLElement,
					onChange: (pos) => renderer.updateProps({ pos }),
					onReady: (controller) => {
						storage.controller = controller;
					}
				})
			];
		},

		onDestroy() {
			const storage = this.storage as DragHandleStorage;
			storage.renderer?.destroy();
			storage.renderer = null;
			storage.controller = null;
		}
	});

export const createDragHandleExtension = (options: DragHandleOptions = {}) =>
	DragHandleExtension.configure(options);

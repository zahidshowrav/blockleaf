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
			return { renderer: null, controller: null };
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

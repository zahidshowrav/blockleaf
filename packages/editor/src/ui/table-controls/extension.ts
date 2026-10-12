import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';

import { resolveTableActions } from './actions.js';
import { createTableControlsPlugin } from './plugin.js';
import {
	TableControls,
	type TableControlsComponentProps
} from './table-controls.js';
import type { TableControlsOptions } from './types.js';

type TableControlsStorage = {
	renderer: ReactRenderer<unknown, TableControlsComponentProps> | null;
	setLocked: ((locked: boolean) => void) | null;
};

export const TableControlsExtension =
	/* @__PURE__ */ Extension.create<TableControlsOptions>({
		name: 'tableControls',

		addOptions() {
			return { actions: undefined };
		},

		addStorage(): TableControlsStorage {
			return { renderer: null, setLocked: null };
		},

		addProseMirrorPlugins() {
			const storage = this.storage as TableControlsStorage;
			const actions = resolveTableActions(this.options.actions);

			const renderer = new ReactRenderer<
				unknown,
				TableControlsComponentProps
			>(TableControls, {
				editor: this.editor,
				props: {
					editor: this.editor,
					actions,
					placement: null,
					onLockChange: (locked: boolean) =>
						storage.setLocked?.(locked)
				}
			});
			storage.renderer = renderer;

			return [
				createTableControlsPlugin({
					element: renderer.element as HTMLElement,
					onChange: (placement) =>
						renderer.updateProps({ placement }),
					onReady: (setLocked) => {
						storage.setLocked = setLocked;
					}
				})
			];
		},

		onDestroy() {
			const storage = this.storage as TableControlsStorage;
			storage.renderer?.destroy();
			storage.renderer = null;
			storage.setLocked = null;
		}
	});

export const createTableControlsExtension = (
	options: TableControlsOptions = {}
) => TableControlsExtension.configure(options);

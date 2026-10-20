import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';

import { createTableActions, resolveTableActions } from './actions.js';
import { createTableControlsPlugin } from './plugin.js';
import {
	TableControls,
	type TableControlsComponentProps
} from './table-controls.js';
import type { TableControlsOptions } from './types.js';
import { defaultLabels } from '../../core/labels.js';

type TableControlsStorage = {
	renderer: ReactRenderer<unknown, TableControlsComponentProps> | null;
	setLocked: ((locked: boolean) => void) | null;
	openRequest: number;
};

export const TableControlsExtension =
	/* @__PURE__ */ Extension.create<TableControlsOptions>({
		name: 'tableControls',

		addOptions() {
			return { actions: undefined, labels: undefined };
		},

		addStorage(): TableControlsStorage {
			return { renderer: null, setLocked: null, openRequest: 0 };
		},

		addKeyboardShortcuts() {
			/**
			 * The handles are rendered whenever the cursor is in a table, but
			 * `Tab` inside a table is cell navigation (EC-16), so there is no
			 * tab-stop route to them. These are the keyboard route.
			 */
			const open = (axis: 'row' | 'column') => () => {
				const storage = this.storage as TableControlsStorage;
				if (!storage.renderer) return false;
				if (!this.editor.can().addRowAfter()) return false;

				storage.openRequest += 1;
				storage.renderer.updateProps({
					openRequest: storage.openRequest,
					openAxis: axis
				});
				storage.setLocked?.(true);
				return true;
			};

			return {
				'Mod-Alt-r': open('row'),
				'Mod-Alt-R': open('row'),
				'Mod-Alt-c': open('column'),
				'Mod-Alt-C': open('column')
			};
		},

		addProseMirrorPlugins() {
			const storage = this.storage as TableControlsStorage;
			const labels = this.options.labels ?? defaultLabels;
			const actions = resolveTableActions(
				this.options.actions,
				createTableActions(labels.table)
			);

			const renderer = new ReactRenderer<
				unknown,
				TableControlsComponentProps
			>(TableControls, {
				editor: this.editor,
				props: {
					editor: this.editor,
					actions,
					labels,
					placement: null,
					openRequest: 0,
					openAxis: 'row',
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

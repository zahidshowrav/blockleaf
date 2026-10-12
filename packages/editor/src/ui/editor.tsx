import { useMemo, type ReactNode } from 'react';

import { createExtensions } from '../core/index.js';
import {
	BlockleafEditor as BaseBlockleafEditor,
	type BlockleafEditorProps as BaseBlockleafEditorProps
} from '../react/index.js';
import {
	createBubbleMenuExtension,
	type BubbleAction,
	type BubbleMenuShouldShow
} from './bubble-menu/index.js';
import {
	createDragHandleExtension,
	type BlockAction
} from './drag-handle/index.js';
import {
	createPlaceholderExtension,
	type PlaceholderLabels
} from './placeholder.js';
import {
	createSlashMenuExtension,
	type CommandRegistry,
	type SlashCommand
} from './slash-menu/index.js';
import {
	createCellMenuExtension,
	createTableControlsExtension,
	type TableAction
} from './table-controls/index.js';

export type BlockleafEditorProps = Omit<
	BaseBlockleafEditorProps,
	'extensions'
> & {
	extensions?: BaseBlockleafEditorProps['extensions'];
	/**
	 * Whether the slash menu is enabled. Defaults to `true`.
	 */
	slashMenu?: boolean;
	/**
	 * Custom slash menu commands array or a function receiving defaults.
	 */
	slashItems?:
		SlashCommand[] | ((defaults: SlashCommand[]) => SlashCommand[]);
	/**
	 * Custom command registry instance for full programmatic control.
	 */
	slashRegistry?: CommandRegistry;
	/**
	 * Whether the selection bubble menu is enabled. Defaults to `true`.
	 */
	bubbleMenu?: boolean;
	/**
	 * Custom bubble menu actions array or a function receiving defaults.
	 */
	bubbleActions?:
		BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/**
	 * Whether the bubble menu offers the link editor. Defaults to `true`.
	 */
	linkEditor?: boolean;
	/**
	 * Overrides when the bubble menu is shown.
	 */
	bubbleShouldShow?: BubbleMenuShouldShow;
	/**
	 * Whether the drag handle and block menu are enabled. Defaults to `true`.
	 */
	dragHandle?: boolean;
	/**
	 * Custom block menu actions array or a function receiving defaults.
	 */
	blockActions?: BlockAction[] | ((defaults: BlockAction[]) => BlockAction[]);
	/**
	 * Whether the handle shows the `+` insert button. Defaults to `true`.
	 */
	insertButton?: boolean;
	/**
	 * Whether in-table row and column handles are enabled. Defaults to `true`.
	 */
	tableControls?: boolean;
	/**
	 * Custom table actions array or a function receiving defaults.
	 */
	tableActions?: TableAction[] | ((defaults: TableAction[]) => TableAction[]);
	/**
	 * Whether the in-table cell bubble menu is enabled. Defaults to `true`.
	 */
	cellMenu?: boolean;
	/**
	 * Custom cell menu actions array or a function receiving defaults.
	 */
	cellActions?:
		BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/**
	 * Placeholder text for the focused empty block. A string applies to every
	 * block; an object labels paragraphs and headings separately. `false`
	 * turns the placeholder off.
	 */
	placeholder?: string | PlaceholderLabels | false;
	children?: ReactNode;
};

export const BlockleafEditor = ({
	extensions,
	preset = 'standard',
	slashMenu = true,
	slashItems,
	slashRegistry,
	bubbleMenu = true,
	bubbleActions,
	linkEditor = true,
	bubbleShouldShow,
	dragHandle = true,
	blockActions,
	insertButton = true,
	tableControls = true,
	tableActions,
	cellMenu = true,
	cellActions,
	placeholder,
	...rest
}: BlockleafEditorProps) => {
	const resolvedExtensions = useMemo(() => {
		const base = extensions ?? createExtensions(preset);
		const chrome = [...base];

		const hasSlashMenu = chrome.some((ext) => ext.name === 'slashMenu');
		if (slashMenu && !hasSlashMenu) {
			chrome.push(
				createSlashMenuExtension({
					items: slashItems,
					registry: slashRegistry
				})
			);
		}

		const hasBubbleMenu = chrome.some((ext) => ext.name === 'bubbleMenu');
		if (bubbleMenu && !hasBubbleMenu) {
			chrome.push(
				createBubbleMenuExtension({
					actions: bubbleActions,
					link: linkEditor,
					shouldShow: bubbleShouldShow
				})
			);
		}

		const hasDragHandle = chrome.some((ext) => ext.name === 'dragHandle');
		if (dragHandle && !hasDragHandle) {
			chrome.push(
				createDragHandleExtension({
					actions: blockActions,
					insertButton
				})
			);
		}

		const hasTableControls = chrome.some(
			(ext) => ext.name === 'tableControls'
		);
		if (tableControls && !hasTableControls) {
			chrome.push(
				createTableControlsExtension({ actions: tableActions })
			);
		}

		const hasCellMenu = chrome.some((ext) => ext.name === 'cellMenu');
		if (cellMenu && !hasCellMenu) {
			chrome.push(createCellMenuExtension({ actions: cellActions }));
		}

		const hasPlaceholder = chrome.some((ext) => ext.name === 'placeholder');
		if (placeholder !== false && !hasPlaceholder) {
			chrome.push(createPlaceholderExtension({ placeholder }));
		}

		return chrome;
	}, [
		extensions,
		preset,
		slashMenu,
		slashItems,
		slashRegistry,
		bubbleMenu,
		bubbleActions,
		linkEditor,
		bubbleShouldShow,
		dragHandle,
		blockActions,
		insertButton,
		tableControls,
		tableActions,
		cellMenu,
		cellActions,
		placeholder
	]);

	return (
		<BaseBlockleafEditor
			preset={preset}
			extensions={resolvedExtensions}
			{...rest}
		/>
	);
};

export const Editor = BlockleafEditor;

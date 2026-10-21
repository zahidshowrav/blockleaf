import { useMemo, type ReactNode } from 'react';

import {
	TABLE_A11Y_EXTENSION_NAME,
	UPLOAD_EXTENSION_NAME
} from '../core/constants.js';
import {
	createExtensions,
	defaultLabels,
	resolveLabels,
	type BlockleafLabels
} from '../core/index.js';
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
	createImageMenuExtension,
	type ImageMenuOptions
} from './image/index.js';
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
	 * Whether the bubble menu for a selected image is enabled. Defaults to
	 * `true`.
	 */
	imageMenu?: boolean;
	/**
	 * Custom image menu actions array or a function receiving defaults.
	 */
	imageActions?: ImageMenuOptions['actions'];
	/**
	 * Placeholder text for the focused empty block. A string applies to every
	 * block; an object labels paragraphs and headings separately. `false`
	 * turns the placeholder off.
	 */
	placeholder?: string | PlaceholderLabels | false;
	/**
	 * Every string the chrome renders. Anything left out keeps its English
	 * default, so a partial translation is a valid one.
	 *
	 * Give it a stable reference — a module-level constant, or something
	 * memoised — as the extensions are rebuilt when it changes, the same as
	 * for `slashItems` and the other override props.
	 */
	labels?: BlockleafLabels;
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
	imageMenu = true,
	imageActions,
	placeholder,
	labels,
	...rest
}: BlockleafEditorProps) => {
	const resolvedExtensions = useMemo(() => {
		const resolved = resolveLabels(labels);
		const base = extensions ?? createExtensions(preset);
		// Two extensions render strings but are not assembled here: the upload
		// one is built by the host because it needs their adapter, and the table
		// accessibility one comes with `createExtensions`, which knows nothing
		// about labels. Either, if nobody gave it labels of its own, gets these
		// rather than staying stubbornly English.
		const chrome = base.map((extension) =>
			(extension.name === UPLOAD_EXTENSION_NAME ||
				extension.name === TABLE_A11Y_EXTENSION_NAME) &&
			(extension.options as { labels?: unknown }).labels === defaultLabels
				? extension.configure({ labels: resolved })
				: extension
		);

		const hasSlashMenu = chrome.some((ext) => ext.name === 'slashMenu');
		if (slashMenu && !hasSlashMenu) {
			chrome.push(
				createSlashMenuExtension({
					items: slashItems,
					registry: slashRegistry,
					labels: resolved
				})
			);
		}

		const hasBubbleMenu = chrome.some((ext) => ext.name === 'bubbleMenu');
		if (bubbleMenu && !hasBubbleMenu) {
			chrome.push(
				createBubbleMenuExtension({
					actions: bubbleActions,
					link: linkEditor,
					labels: resolved,
					shouldShow: bubbleShouldShow
				})
			);
		}

		const hasDragHandle = chrome.some((ext) => ext.name === 'dragHandle');
		if (dragHandle && !hasDragHandle) {
			chrome.push(
				createDragHandleExtension({
					actions: blockActions,
					labels: resolved,
					insertButton
				})
			);
		}

		const hasTableControls = chrome.some(
			(ext) => ext.name === 'tableControls'
		);
		if (tableControls && !hasTableControls) {
			chrome.push(
				createTableControlsExtension({
					actions: tableActions,
					labels: resolved
				})
			);
		}

		const hasCellMenu = chrome.some((ext) => ext.name === 'cellMenu');
		if (cellMenu && !hasCellMenu) {
			chrome.push(
				createCellMenuExtension({
					actions: cellActions,
					labels: resolved
				})
			);
		}

		const hasImageMenu = chrome.some((ext) => ext.name === 'imageMenu');
		if (imageMenu && !hasImageMenu) {
			chrome.push(
				createImageMenuExtension({
					actions: imageActions,
					labels: resolved
				})
			);
		}

		const hasPlaceholder = chrome.some((ext) => ext.name === 'placeholder');
		if (placeholder !== false && !hasPlaceholder) {
			chrome.push(
				createPlaceholderExtension({
					placeholder: placeholder ?? resolved.placeholder
				})
			);
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
		imageMenu,
		imageActions,
		placeholder,
		labels
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

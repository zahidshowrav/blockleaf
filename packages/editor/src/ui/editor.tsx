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
	createSlashMenuExtension,
	type CommandRegistry,
	type SlashCommand
} from './slash-menu/index.js';

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
		bubbleShouldShow
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

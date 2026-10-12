import { useMemo, type ReactNode } from 'react';

import { createExtensions } from '../core/index.js';
import {
	BlockleafEditor as BaseBlockleafEditor,
	type BlockleafEditorProps as BaseBlockleafEditorProps
} from '../react/index.js';
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
	children?: ReactNode;
};

export const BlockleafEditor = ({
	extensions,
	preset = 'standard',
	slashMenu = true,
	slashItems,
	slashRegistry,
	...rest
}: BlockleafEditorProps) => {
	const resolvedExtensions = useMemo(() => {
		const base = extensions ?? createExtensions(preset);
		if (!slashMenu) {
			return base;
		}

		const hasSlashMenu = base.some((ext) => ext.name === 'slashMenu');
		if (hasSlashMenu) {
			return base;
		}

		return [
			...base,
			createSlashMenuExtension({
				items: slashItems,
				registry: slashRegistry
			})
		];
	}, [extensions, preset, slashMenu, slashItems, slashRegistry]);

	return (
		<BaseBlockleafEditor
			preset={preset}
			extensions={resolvedExtensions}
			{...rest}
		/>
	);
};

export const Editor = BlockleafEditor;

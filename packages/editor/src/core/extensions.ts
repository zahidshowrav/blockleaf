import { Extension, type Extensions } from '@tiptap/core';
import { Highlight } from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Underline } from '@tiptap/extension-underline';
import { UniqueID } from '@tiptap/extension-unique-id';
import { StarterKit } from '@tiptap/starter-kit';

import { HEADING_LEVELS } from './constants.js';
import { Link } from './marks/link.js';
import { Callout } from './nodes/callout.js';
import { PasteNormalizer } from './paste.js';

export type PresetName = 'minimal' | 'standard';

export const BLOCK_NODE_TYPES = [
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
	'horizontalRule',
	'bulletList',
	'orderedList',
	'listItem',
	'taskList',
	'taskItem',
	'callout',
	'table'
] as const;

/**
 * Global keyboard shortcuts covering nodes that lack default bindings
 * in upstream Tiptap packages.
 */
export const Shortcuts = Extension.create({
	name: 'shortcuts',
	addKeyboardShortcuts() {
		return {
			'Mod-Shift-9': () => this.editor.commands.toggleTaskList(),
			'Mod-Alt--': () => this.editor.commands.setHorizontalRule()
		};
	}
});

/**
 * Creates Tiptap extensions for the requested preset.
 *
 * - `minimal`: Inline and micro-content editing (paragraphs, text, bold, italic,
 *   strike, underline, code, sanitised links, and stable paragraph IDs).
 * - `standard`: Full Notion-style document core per docs/schema.md (StarterKit with
 *   capped heading levels 1–3, Underline, Link, Highlight, TaskList, TaskItem,
 *   Callout, and UniqueID for stable block IDs).
 */
export const createExtensions = (
	preset: PresetName = 'standard'
): Extensions => {
	if (preset === 'minimal') {
		return [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
				blockquote: false,
				codeBlock: false,
				horizontalRule: false,
				link: false,
				underline: false
			}),
			Underline,
			Link,
			UniqueID.configure({
				types: ['paragraph']
			}),
			PasteNormalizer
		];
	}

	return [
		StarterKit.configure({
			heading: {
				levels: [...HEADING_LEVELS]
			},
			link: false,
			underline: false
		}),
		Underline,
		Link,
		Highlight.configure({
			multicolor: true
		}),
		TaskList,
		TaskItem.configure({
			nested: true
		}),
		Callout,
		TableKit.configure({
			table: {
				resizable: false
			}
		}),
		UniqueID.configure({
			types: [...BLOCK_NODE_TYPES]
		}),
		Shortcuts,
		PasteNormalizer
	];
};

export const presets: Record<PresetName, () => Extensions> = {
	minimal: () => createExtensions('minimal'),
	standard: () => createExtensions('standard')
};

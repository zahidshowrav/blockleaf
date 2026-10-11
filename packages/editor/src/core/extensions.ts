import type { Extensions } from '@tiptap/core';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Underline } from '@tiptap/extension-underline';
import { StarterKit } from '@tiptap/starter-kit';

import { HEADING_LEVELS } from './constants.js';
import { Link } from './marks/link.js';
import { Callout } from './nodes/callout.js';

export type PresetName = 'minimal' | 'standard';

/**
 * Creates Tiptap extensions for the requested preset.
 *
 * - `minimal`: Inline and micro-content editing (paragraphs, text, bold, italic,
 *   strike, underline, code, and sanitised links).
 * - `standard`: Full Notion-style document core per docs/schema.md (StarterKit with
 *   capped heading levels 1–3, Underline, Link, Highlight, TaskList, TaskItem,
 *   and Callout).
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
			Link
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
		Callout
	];
};

export const presets: Record<PresetName, () => Extensions> = {
	minimal: () => createExtensions('minimal'),
	standard: () => createExtensions('standard')
};

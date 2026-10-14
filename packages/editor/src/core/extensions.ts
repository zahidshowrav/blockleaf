import { Extension, InputRule, type Extensions } from '@tiptap/core';
import { Highlight } from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Underline } from '@tiptap/extension-underline';
import { UniqueID } from '@tiptap/extension-unique-id';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { StarterKit } from '@tiptap/starter-kit';

import { HEADING_LEVELS, NORMALISATION_META } from './constants.js';
import { Link } from './marks/link.js';
import { Callout } from './nodes/callout.js';
import { Image } from './nodes/image.js';
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
	'image',
	'table'
] as const;

/**
 * Block types after which a trailing paragraph is pointless.
 *
 * StarterKit ships `trailingNode` with an empty `notAfter`, which appends an
 * empty paragraph after *every* non-paragraph last block — including a
 * heading. That paragraph is then saved, and the stored document is the
 * product, so the default is not acceptable: a document ending in a heading
 * must not grow a phantom block.
 */
export const TRAILING_NODE_NOT_AFTER = ['paragraph', 'heading'] as const;

const needsTrailingNode = (doc: ProseMirrorNode) => {
	const last = doc.lastChild;
	if (!last) return false;
	return !TRAILING_NODE_NOT_AFTER.includes(
		last.type.name as (typeof TRAILING_NODE_NOT_AFTER)[number]
	);
};

/**
 * Gives the inserted paragraph its block id up front.
 *
 * Without it `UniqueID` notices an id-less block and dispatches its own,
 * untagged transaction to add one — which `onChange` then reports as a user
 * edit, undoing the whole point of tagging the insert.
 */
const trailingNodeAttrs = (editor: {
	extensionManager: { extensions: Array<{ name: string; options: unknown }> };
}): Record<string, unknown> => {
	const uniqueId = editor.extensionManager.extensions.find(
		(extension) => extension.name === 'uniqueID'
	);
	if (!uniqueId) return {};

	const options = uniqueId.options as {
		attributeName?: string;
		generateID?: (context: unknown) => unknown;
	};
	if (typeof options.generateID !== 'function') return {};

	return {
		[options.attributeName ?? 'id']: options.generateID({})
	};
};

/**
 * Applies the trailing-node rule once to the document the editor was *created*
 * with.
 *
 * `trailingNode` only appends from `appendTransaction`, which never runs for
 * the initial document — so a saved document ending in a table opens with
 * nowhere to click after it, which is the whole case the rule exists for.
 */
export const TrailingNodeOnLoad = /* @__PURE__ */ Extension.create({
	name: 'trailingNodeOnLoad',

	onCreate() {
		const { state, view } = this.editor;
		if (!needsTrailingNode(state.doc)) return;

		const paragraph = state.schema.nodes.paragraph;
		if (!paragraph) return;

		view.dispatch(
			state.tr
				.insert(
					state.doc.content.size,
					paragraph.create(trailingNodeAttrs(this.editor))
				)
				// Opening a document is not editing it, and the first Ctrl+Z
				// must not undo something the user never did.
				.setMeta(NORMALISATION_META, true)
				.setMeta('addToHistory', false)
		);
	}
});

/**
 * Global keyboard shortcuts covering nodes that lack default bindings
 * in upstream Tiptap packages.
 */
export const Shortcuts = Extension.create({
	name: 'shortcuts',
	addKeyboardShortcuts() {
		const insertTableAction = () =>
			this.editor.commands.insertTable({
				rows: 3,
				cols: 3,
				withHeaderRow: true
			});

		return {
			'Mod-Shift-9': () => this.editor.commands.toggleTaskList(),
			'Mod-Alt--': () => this.editor.commands.setHorizontalRule(),
			'Mod-Alt-t': insertTableAction,
			'Mod-Alt-T': insertTableAction
		};
	},
	addInputRules() {
		return [
			new InputRule({
				find: /^\s*\|{3}\s$/,
				handler: ({ chain, range }) => {
					chain()
						.deleteRange(range)
						.insertTable({
							rows: 3,
							cols: 3,
							withHeaderRow: true
						})
						.run();
				}
			})
		];
	}
});

/**
 * Creates Tiptap extensions for the requested preset.
 *
 * - `minimal`: Inline and micro-content editing (paragraphs, text, bold, italic,
 *   strike, underline, code, sanitised links, and stable paragraph IDs).
 * - `standard`: Full Notion-style document core per apps/docs/content/docs/schema.mdx (StarterKit with
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
			underline: false,
			trailingNode: { notAfter: [...TRAILING_NODE_NOT_AFTER] }
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
		Image,
		TableKit.configure({
			table: {
				resizable: false
			}
		}),
		UniqueID.configure({
			types: [...BLOCK_NODE_TYPES]
		}),
		Shortcuts,
		TrailingNodeOnLoad,
		PasteNormalizer
	];
};

export const presets: Record<PresetName, () => Extensions> = {
	minimal: () => createExtensions('minimal'),
	standard: () => createExtensions('standard')
};

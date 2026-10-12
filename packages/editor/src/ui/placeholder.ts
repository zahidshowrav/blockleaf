import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { HEADING_LEVELS } from '../core/index.js';

export const PLACEHOLDER_PLUGIN_KEY = /* @__PURE__ */ new PluginKey(
	'blockleafPlaceholder'
);

export type PlaceholderLabels = {
	/** Shown in an empty paragraph. */
	paragraph?: string;
	/** Shown in an empty heading, by level. */
	heading?: (level: number) => string;
	/** Shown in any other empty block that has no label of its own. */
	fallback?: string;
};

export const defaultPlaceholderLabels: Required<PlaceholderLabels> = {
	paragraph: "Type '/' for commands",
	heading: (level) =>
		HEADING_LEVELS.includes(level as (typeof HEADING_LEVELS)[number])
			? `Heading ${level}`
			: 'Heading',
	fallback: ''
};

export type PlaceholderExtensionOptions = {
	/** A single string for every empty block, or per-node labels. */
	placeholder?: string | PlaceholderLabels;
};

const resolveLabels = (
	placeholder: PlaceholderExtensionOptions['placeholder']
): Required<PlaceholderLabels> =>
	typeof placeholder === 'string'
		? {
				...defaultPlaceholderLabels,
				paragraph: placeholder,
				fallback: placeholder
			}
		: { ...defaultPlaceholderLabels, ...placeholder };

export const labelFor = (
	node: ProseMirrorNode,
	labels: Required<PlaceholderLabels>
): string => {
	if (node.type.name === 'heading') {
		return labels.heading(node.attrs.level as number);
	}
	if (node.type.name === 'paragraph') {
		return labels.paragraph;
	}
	return labels.fallback;
};

/**
 * Labels the empty block the cursor is in.
 *
 * Hand-rolled rather than using `Placeholder` from `@tiptap/extensions`,
 * which declares no `sideEffects: false` — so a bundler keeps the whole
 * 60 kB package even for a consumer that imports nothing but
 * `createEmptyDocument`. The 2 kB schema-only budget exists to catch exactly
 * that, and it did. See F13 in `docs/open-flags.md`.
 *
 * Only the current block is labelled. Labelling every empty block at once
 * turns a new document into a wall of grey text, which reads as content
 * rather than as absence.
 */
export const PlaceholderExtension =
	/* @__PURE__ */ Extension.create<PlaceholderExtensionOptions>({
		name: 'placeholder',

		addOptions() {
			return { placeholder: undefined };
		},

		addProseMirrorPlugins() {
			const labels = resolveLabels(this.options.placeholder);
			const { editor } = this;

			return [
				new Plugin({
					key: PLACEHOLDER_PLUGIN_KEY,
					props: {
						decorations: (state) => {
							if (!editor.isEditable) return null;

							const { selection, doc } = state;
							if (!selection.empty) return null;

							const { $from } = selection;
							const node = $from.parent;
							if (node.content.size > 0) return null;
							if (!node.isTextblock) return null;

							const label = labelFor(node, labels);
							if (!label) return null;

							const from = $from.before();
							return DecorationSet.create(doc, [
								Decoration.node(from, from + node.nodeSize, {
									class: 'blockleaf-empty-node',
									'data-placeholder': label
								})
							]);
						}
					}
				})
			];
		}
	});

export const createPlaceholderExtension = (
	options: PlaceholderExtensionOptions = {}
) => PlaceholderExtension.configure(options);

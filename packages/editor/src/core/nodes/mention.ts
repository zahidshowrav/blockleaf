import { mergeAttributes, Node } from '@tiptap/core';

import { MENTION_NODE, MENTION_PREFIX } from '../constants.js';

/** What a stored mention carries. */
export interface MentionAttributes {
	/** The host's own key for what is mentioned. Blockleaf never reads it. */
	id: string;
	/** The name when it was mentioned, so a page can show it without asking the host. */
	label: string;
	/** What sort of thing it is — `'user'`, `'page'` — when a host has more than one. */
	kind?: string | null;
}

export interface MentionOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mention: {
			/** Inserts a mention at the selection, and a space after it. */
			insertMention: (attributes: MentionAttributes) => ReturnType;
		};
	}
}

const text = (value: unknown): string =>
	typeof value === 'string' ? value : '';

/** The text a mention shows: the prefix, then its label. */
export const mentionText = (label: unknown): string =>
	`${MENTION_PREFIX}${text(label)}`;

/**
 * A mention: an inline, uneditable reference to something the
 * host knows about — a person, a page. It stores the host's key and the name
 * at the time, never anything Blockleaf would have to look up.
 *
 * Only the node. The picker that inserts one is React, so it lives a layer up
 * in `@blockleaf/editor/mentions`, with this.
 */
export const Mention = /* @__PURE__ */ Node.create<MentionOptions>({
	name: MENTION_NODE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: false,

	addOptions() {
		return { HTMLAttributes: {} };
	},

	addAttributes() {
		return {
			id: {
				default: '',
				// `data-id` is what other editors write. Blockleaf writes
				// `data-mention-id`, because `data-id` is a block's id here.
				parseHTML: (element) =>
					element.getAttribute('data-mention-id') ??
					element.getAttribute('data-id') ??
					'',
				renderHTML: (attributes) => ({
					'data-mention-id': text(attributes.id)
				})
			},
			label: {
				default: '',
				parseHTML: (element) =>
					element.getAttribute('data-label') ??
					(element.textContent ?? '').replace(/^@/, ''),
				renderHTML: (attributes) => ({
					'data-label': text(attributes.label)
				})
			},
			kind: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-kind'),
				renderHTML: (attributes) =>
					typeof attributes.kind === 'string' && attributes.kind
						? { 'data-kind': attributes.kind }
						: {}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-type="mention"]',
				// Without a key it names nothing; leave it as its text.
				getAttrs: (element) =>
					element.hasAttribute('data-mention-id') ||
					element.hasAttribute('data-id')
						? null
						: false
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': MENTION_NODE,
				class: 'blockleaf-mention'
			}),
			mentionText(node.attrs.label)
		];
	},

	renderText({ node }) {
		return mentionText(node.attrs.label);
	},

	addCommands() {
		return {
			insertMention:
				(attributes) =>
				({ commands }) =>
					commands.insertContent([
						{
							type: this.name,
							attrs: {
								id: attributes.id,
								label: attributes.label,
								kind: attributes.kind ?? null
							}
						},
						{ type: 'text', text: ' ' }
					])
		};
	}
});

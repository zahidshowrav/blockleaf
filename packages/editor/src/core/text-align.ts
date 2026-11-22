import { Extension } from '@tiptap/core';

import {
	TEXT_ALIGN_ATTRIBUTE_EXTENSION_NAME,
	TEXT_ALIGN_EXTENSION_NAME,
	TEXT_ALIGN_TYPES,
	TEXT_ALIGNMENTS
} from './constants.js';

export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

const ALIGNMENTS: ReadonlySet<string> = new Set(TEXT_ALIGNMENTS);
const TYPES: ReadonlySet<string> = new Set(TEXT_ALIGN_TYPES);

/** A stored or pasted value, kept only if it is one of the four tokens. */
export const readTextAlign = (value: unknown): TextAlignment | undefined =>
	typeof value === 'string' && ALIGNMENTS.has(value)
		? (value as TextAlignment)
		: undefined;

/**
 * Text alignment as an attribute (`PA-06`, `F25`) — only the attribute.
 *
 * It is in every preset, not in `@blockleaf/editor/text-style` with the
 * commands and buttons, because an editor drops an attribute it does not
 * know: a document aligned in one editor would lose it when saved from
 * another that skipped the subpath. A mark survives that; an attribute
 * does not.
 *
 * Stored as a token, never a CSS value (`F18`). Anything else — pasted
 * `text-align: start`, a hand-edited `"middle"` — reads as `null`.
 */
export const TextAlignAttribute = /* @__PURE__ */ Extension.create({
	name: TEXT_ALIGN_ATTRIBUTE_EXTENSION_NAME,

	addGlobalAttributes() {
		return [
			{
				types: [...TEXT_ALIGN_TYPES],
				attributes: {
					textAlign: {
						// `undefined`, not `null`: a key that is `undefined`
						// does not survive `JSON.stringify`, so an unaligned
						// block stores exactly what it stored before version
						// 2 — no `"textAlign": null` on every paragraph of
						// every document, and a document opened and saved
						// unedited comes back byte for byte.
						default: undefined,
						parseHTML: (element) =>
							readTextAlign(element.style.textAlign),
						renderHTML: (attributes) => {
							const align = readTextAlign(attributes.textAlign);
							return align
								? { style: `text-align: ${align}` }
								: {};
						}
					}
				}
			}
		];
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		textAlign: {
			/**
			 * Aligns every paragraph and heading in the selection. When they
			 * all have that alignment already, takes it off instead.
			 */
			setTextAlign: (alignment: TextAlignment) => ReturnType;
			/** Takes the alignment off every paragraph and heading in the selection. */
			unsetTextAlign: () => ReturnType;
		};
	}
}

/**
 * The commands and shortcuts for `textAlign` (`PA-06`): `Mod-Shift-L`, `E`,
 * `R` and `J`. Exported from `@blockleaf/editor/text-style`, not the root —
 * the attribute itself is `TextAlignAttribute`, in every preset.
 */
export const TextAlign = /* @__PURE__ */ Extension.create({
	name: TEXT_ALIGN_EXTENSION_NAME,

	addCommands() {
		return {
			setTextAlign:
				(alignment) =>
				({ state, commands }) => {
					if (!ALIGNMENTS.has(alignment)) return false;
					const { from, to } = state.selection;
					let any = false;
					let all = true;
					state.doc.nodesBetween(from, to, (node) => {
						if (!TYPES.has(node.type.name)) return true;
						any = true;
						if (node.attrs.textAlign !== alignment) all = false;
						return false;
					});
					if (!any) return false;
					if (all) return commands.unsetTextAlign();
					return TEXT_ALIGN_TYPES.map((type) =>
						commands.updateAttributes(type, {
							textAlign: alignment
						})
					).some(Boolean);
				},
			unsetTextAlign:
				() =>
				({ commands }) =>
					TEXT_ALIGN_TYPES.map((type) =>
						commands.resetAttributes(type, 'textAlign')
					).some(Boolean)
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
			'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
			'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
			'Mod-Shift-j': () => this.editor.commands.setTextAlign('justify')
		};
	}
});

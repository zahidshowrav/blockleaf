import { Extension } from '@tiptap/core';

import {
	BLOCK_BACKGROUND_EXTENSION_NAME,
	BLOCK_BACKGROUND_TYPES,
	STYLE_TOKEN
} from './constants.js';

const TYPES: ReadonlySet<string> = new Set(BLOCK_BACKGROUND_TYPES);

/** A stored or pasted value, kept only if it is a token. */
export const readBlockBackground = (value: unknown): string | undefined =>
	typeof value === 'string' && STYLE_TOKEN.test(value) ? value : undefined;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		blockBackground: {
			/**
			 * Gives a block a background colour, a token such as `'yellow'`,
			 * or takes it off with `null`. With `pos`, the block that starts
			 * there; without, every top-level block the selection touches.
			 * Paragraphs, headings, quotes, lists and toggles take one.
			 */
			setBlockBackground: (
				color: string | null,
				pos?: number
			) => ReturnType;
		};
	}
}

/**
 * A block's background colour: the `backgroundColor` attribute on the text
 * blocks, and the command that sets it. In every preset, for the reason
 * `textAlign` is: an editor drops an attribute it does not know, so one in a
 * subpath would be lost whenever a document was saved from an editor
 * without it.
 *
 * Stored as a token and drawn through `--bl-highlight-<token>`, the palette
 * text background uses, so a colour reads the same on a block as on a word,
 * in a light theme and a dark one. Unset, nothing is stored.
 */
export const BlockBackground = /* @__PURE__ */ Extension.create({
	name: BLOCK_BACKGROUND_EXTENSION_NAME,

	addGlobalAttributes() {
		return [
			{
				types: [...BLOCK_BACKGROUND_TYPES],
				attributes: {
					backgroundColor: {
						// `undefined`, as for `textAlign`: a block with no
						// colour stores exactly what it stored before.
						default: undefined,
						parseHTML: (element) =>
							readBlockBackground(element.dataset.background),
						renderHTML: (attributes) => {
							const color = readBlockBackground(
								attributes.backgroundColor
							);
							return color
								? {
										'data-background': color,
										style: `background-color: var(--bl-highlight-${color})`
									}
								: {};
						}
					}
				}
			}
		];
	},

	addCommands() {
		return {
			setBlockBackground:
				(color, pos) =>
				({ state, tr, dispatch }) => {
					const value =
						color === null ? undefined : readBlockBackground(color);
					if (color !== null && value === undefined) return false;
					const targets: number[] = [];
					if (pos !== undefined) {
						const node = state.doc.nodeAt(pos);
						if (node && TYPES.has(node.type.name))
							targets.push(pos);
					} else {
						const { from, to } = state.selection;
						state.doc.nodesBetween(from, to, (node, at) => {
							if (TYPES.has(node.type.name)) targets.push(at);
							// Top-level blocks only: a list is coloured whole.
							return false;
						});
					}
					if (targets.length === 0) return false;
					if (dispatch) {
						for (const at of targets) {
							tr.setNodeAttribute(at, 'backgroundColor', value);
						}
					}
					return true;
				}
		};
	}
});

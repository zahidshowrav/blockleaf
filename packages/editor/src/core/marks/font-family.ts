import { Mark } from '@tiptap/core';

import { readStyleToken, tokenMarkConfig } from './token-mark.js';
import { FONT_FAMILY_MARK } from '../constants.js';

/** The CSS a family token resolves to: its custom property, else the surrounding font. */
export const fontFamilyStyle = (token: string): string =>
	`font-family: var(--bl-font-${token}, inherit)`;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		fontFamily: {
			/** Sets the selection in a family token — `'serif'`, or one a host defines. */
			setFontFamily: (family: string) => ReturnType;
			/** Takes the family off the selection. */
			unsetFontFamily: () => ReturnType;
		};
	}
}

/**
 * Font family (`PA-10`). A token, never a font name (`F18`): `serif`
 * resolves through `--bl-font-serif`, so a host that changes its type
 * changes every document at once, and a font a reader does not have never
 * reaches the page by name. A mark of its own (`F26`).
 */
export const FontFamily = /* @__PURE__ */ Mark.create({
	name: FONT_FAMILY_MARK,

	...tokenMarkConfig({
		attribute: 'family',
		dataAttribute: 'data-font-family',
		style: fontFamilyStyle
	}),

	addCommands() {
		return {
			setFontFamily:
				(family) =>
				({ commands }) =>
					readStyleToken(family)
						? commands.setMark(this.name, { family })
						: false,
			unsetFontFamily:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});

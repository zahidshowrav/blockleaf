import { Highlight as TiptapHighlight } from '@tiptap/extension-highlight';

import { STYLE_TOKEN } from '../constants.js';

/**
 * A colour written before tokens: a hex, `rgb()` or `hsl()` value a
 * host stored through Tiptap's own `setHighlight`. It still renders, so no
 * stored document changes; anything else that is not a token — a value with
 * a `;` in it above all — is dropped rather than written into `style`.
 */
const LEGACY_COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(\s*[\d.%\s,/]+\))$/i;

/**
 * The background a stored `color` resolves to, or nothing. A token goes
 * through `--bl-highlight-<token>`, falling back to the token itself so a
 * CSS colour name stored before tokens — `yellow`, `gold` — still shows.
 */
export const highlightBackground = (color: unknown): string | undefined => {
	if (typeof color !== 'string') return undefined;
	if (STYLE_TOKEN.test(color))
		return `var(--bl-highlight-${color}, ${color})`;
	if (LEGACY_COLOR.test(color.trim())) return color.trim();
	return undefined;
};

/**
 * The highlight mark, which is also text background colour. Its
 * `color` has been in the schema since `0.1.0`; what changes is that the
 * editor now writes a token there and resolves it per theme, while a
 * colour stored before still renders as it did.
 */
export const Highlight = /* @__PURE__ */ TiptapHighlight.extend({
	addAttributes() {
		return {
			color: {
				default: null,
				parseHTML: (element) => {
					const value =
						element.getAttribute('data-color') ??
						(element.style.backgroundColor || null);
					return highlightBackground(value) ? value : null;
				},
				renderHTML: (attributes) => {
					const background = highlightBackground(attributes.color);
					if (!background) return {};
					return {
						'data-color': attributes.color as string,
						style: `background-color: ${background}; color: inherit`
					};
				}
			}
		};
	}
}).configure({ multicolor: true });

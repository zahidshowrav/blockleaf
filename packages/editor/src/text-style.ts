/**
 * Text styles, as an opt-in subpath (`PA-06`, `PA-07`, and later `PA-05`,
 * `PA-10`, `PA-11`, `PA-22`).
 *
 * The marks are in the stored schema from version 2. An editor that does not
 * load them keeps a stored one as a placeholder and saves it back unchanged.
 * Text alignment is the exception: it is an attribute, so the attribute is
 * in every preset and only its commands and shortcuts are here (`F25`).
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withTextStyle } from '@blockleaf/editor/text-style';
 *
 * const extensions = withTextStyle(presets.standard());
 * ```
 */
import type { Extensions } from '@tiptap/core';

import {
	SUBSCRIPT_MARK,
	SUPERSCRIPT_MARK,
	TEXT_ALIGN_EXTENSION_NAME
} from './core/constants.js';
import { Subscript, Superscript } from './core/marks/script.js';
import { TextAlign } from './core/text-align.js';

export {
	SUBSCRIPT_MARK,
	SUPERSCRIPT_MARK,
	TEXT_ALIGNMENTS,
	TEXT_ALIGN_EXTENSION_NAME
} from './core/constants.js';
export { Subscript, Superscript } from './core/marks/script.js';
export { TextAlign, type TextAlignment } from './core/text-align.js';

/** Every text style this subpath has, ready to add to an extension list. */
export const createTextStyle = (): Extensions => [
	Subscript,
	Superscript,
	TextAlign
];

const NAMES: ReadonlySet<string> = new Set([
	SUBSCRIPT_MARK,
	SUPERSCRIPT_MARK,
	TEXT_ALIGN_EXTENSION_NAME
]);

/**
 * Adds the text styles to an extension list, replacing any extension of the
 * same name already in it — two with one name is a Tiptap warning and an
 * undefined winner.
 */
export const withTextStyle = (extensions: Extensions): Extensions => [
	...extensions.filter((extension) => !NAMES.has(extension.name)),
	...createTextStyle()
];

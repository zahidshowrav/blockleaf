import { Subscript as TiptapSubscript } from '@tiptap/extension-subscript';
import { Superscript as TiptapSuperscript } from '@tiptap/extension-superscript';

import { SUBSCRIPT_MARK, SUPERSCRIPT_MARK } from '../constants.js';

/**
 * Subscript. Tiptap's, except that it and superscript exclude each
 * other: text cannot sit above and below the line at once, and a document
 * that stores both on one run means nothing a renderer can draw.
 */
export const Subscript = /* @__PURE__ */ TiptapSubscript.extend({
	name: SUBSCRIPT_MARK,
	excludes: SUPERSCRIPT_MARK
});

/** Superscript. See `Subscript`. */
export const Superscript = /* @__PURE__ */ TiptapSuperscript.extend({
	name: SUPERSCRIPT_MARK,
	excludes: SUBSCRIPT_MARK
});
